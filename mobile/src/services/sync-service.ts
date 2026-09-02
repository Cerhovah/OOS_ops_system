import type { SQLiteDatabase } from 'expo-sqlite';

import { SyncRepository, type RemoteSyncRecord } from '@/data/sync-repository';
import { getSupabaseClient } from '@/services/supabase';

interface RemoteRecordCandidate {
  user_id?: unknown;
  table_name?: unknown;
  local_id?: unknown;
  payload?: unknown;
  client_updated_at?: unknown;
  deleted_at?: unknown;
  server_updated_at?: unknown;
}

interface AppliedCandidate {
  table_name?: unknown;
  local_id?: unknown;
  applied?: unknown;
}

export interface SyncRunResult {
  pulled: number;
  pushed: number;
  pending: number;
  lastSyncedAt: string;
}

function parseRemoteRecords(value: unknown): RemoteSyncRecord[] {
  if (!Array.isArray(value)) throw new Error('Supabase 동기화 응답 형식이 올바르지 않습니다.');
  return value.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Supabase 동기화 행 형식이 올바르지 않습니다.');
    }
    const candidate = item as RemoteRecordCandidate;
    if (
      typeof candidate.user_id !== 'string' ||
      typeof candidate.table_name !== 'string' ||
      typeof candidate.local_id !== 'string' ||
      candidate.payload === null ||
      typeof candidate.payload !== 'object' ||
      Array.isArray(candidate.payload) ||
      typeof candidate.client_updated_at !== 'string' ||
      (candidate.deleted_at !== null && typeof candidate.deleted_at !== 'string') ||
      typeof candidate.server_updated_at !== 'string'
    ) {
      throw new Error('Supabase 동기화 행의 필수값이 올바르지 않습니다.');
    }
    return {
      user_id: candidate.user_id,
      table_name: candidate.table_name,
      local_id: candidate.local_id,
      payload: candidate.payload as Record<string, unknown>,
      client_updated_at: candidate.client_updated_at,
      deleted_at: candidate.deleted_at,
      server_updated_at: candidate.server_updated_at,
    };
  });
}

function parseAppliedKeys(value: unknown): Set<string> {
  if (!Array.isArray(value)) throw new Error('Supabase 업로드 응답 형식이 올바르지 않습니다.');
  const keys = new Set<string>();
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const candidate = item as AppliedCandidate;
    if (candidate.applied === true && typeof candidate.table_name === 'string' && typeof candidate.local_id === 'string') {
      keys.add(`${candidate.table_name}\u0000${candidate.local_id}`);
    }
  }
  return keys;
}

async function pullAll(userId: string, repository: SyncRepository): Promise<RemoteSyncRecord[]> {
  const client = getSupabaseClient();
  const cursorKey = `last_pulled_server_at:${userId}`;
  const cursor = await repository.getState(cursorKey);
  const pageSize = 500;
  const records: RemoteSyncRecord[] = [];

  for (let offset = 0; ; offset += pageSize) {
    let query = client
      .from('oos_sync_records')
      .select('user_id,table_name,local_id,payload,client_updated_at,deleted_at,server_updated_at')
      .eq('user_id', userId)
      .order('server_updated_at', { ascending: true })
      .order('table_name', { ascending: true })
      .order('local_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (cursor) query = query.gte('server_updated_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const page = parseRemoteRecords(data as unknown);
    records.push(...page);
    if (page.length < pageSize) break;
  }

  const replaceSeedBootstrap = await repository.shouldReplaceSeedBootstrap(records.length > 0);
  await repository.applyRemoteRecords(records, { replaceSeedBootstrap });
  const newest = records.at(-1)?.server_updated_at;
  if (newest) await repository.setState(cursorKey, newest);
  return records;
}

async function pushPending(repository: SyncRepository): Promise<number> {
  const client = getSupabaseClient();
  let pushed = 0;
  for (;;) {
    const outbox = await repository.listOutbox(250);
    if (outbox.length === 0) break;
    const payload = outbox.map((record) => ({
      table_name: record.tableName,
      local_id: record.recordId,
      payload: record.payload,
      client_updated_at: record.localUpdatedAt,
      deleted_at: typeof record.payload.deleted_at === 'string' ? record.payload.deleted_at : null,
    }));
    const { data, error } = await client.rpc('apply_oos_sync_records', { p_records: payload });
    if (error) {
      await repository.markPushFailure(outbox.map((record) => record.id), error.message);
      throw error;
    }
    const appliedKeys = parseAppliedKeys(data as unknown);
    const appliedIds = outbox
      .filter((record) => appliedKeys.has(`${record.tableName}\u0000${record.recordId}`))
      .map((record) => record.id);
    await repository.removeOutbox(appliedIds);
    pushed += appliedIds.length;
    if (appliedIds.length < outbox.length) break;
  }
  return pushed;
}

export async function synchronize(db: SQLiteDatabase, userId: string): Promise<SyncRunResult> {
  const repository = new SyncRepository(db);
  const pulledRecords = await pullAll(userId, repository);
  const pushed = await pushPending(repository);
  const lastSyncedAt = new Date().toISOString();
  await repository.setState('last_sync_at', lastSyncedAt);
  return {
    pulled: pulledRecords.length,
    pushed,
    pending: await repository.pendingCount(),
    lastSyncedAt,
  };
}
