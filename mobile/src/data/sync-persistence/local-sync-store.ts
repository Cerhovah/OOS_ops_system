import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_TIME } from '@/data/migrations';
import { parseOutboxPayload } from '@/data/sync-persistence/record-codec';
import { sqlPlaceholders } from '@/data/sync-persistence/sql';
import type {
  OutboxAcknowledgement,
  OutboxRecord,
  SyncConflict,
} from '@/data/sync-persistence/types';
import { isSyncTableName } from '@/sync/schema';

export class LocalSyncStore {
  constructor(private readonly database: SQLiteDatabase) {}

  async bindOwner(userId: string): Promise<void> {
    if (!userId) throw new Error('동기화 계정 식별자가 비어 있습니다.');
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const key = 'sync_owner_user_id';
      const owner = await transaction.getFirstAsync<{ value: string }>(
        'SELECT value FROM sync_state WHERE key=?',
        key,
      );
      const legacyOwners = owner ? [] : await transaction.getAllAsync<{ key: string }>(
        "SELECT key FROM sync_state WHERE key LIKE 'last_pulled_server_at:%'",
      );
      const inferredOwners = new Set(
        legacyOwners.map((row) => row.key.slice('last_pulled_server_at:'.length)).filter(Boolean),
      );
      const boundOwner = owner?.value ?? (inferredOwners.size === 1 ? [...inferredOwners][0] : null);
      if (inferredOwners.size > 1 || (boundOwner && boundOwner !== userId)) {
        throw new Error(
          '이 기기의 동기화 데이터는 다른 Supabase 계정에 연결되어 있습니다. 계정을 변경하려면 데이터를 내보낸 뒤 전체 초기화를 실행하십시오.',
        );
      }
      if (!owner) {
        const now = new Date().toISOString();
        await transaction.runAsync(
          'INSERT INTO sync_state (key,value,updated_at) VALUES (?,?,?)',
          key,
          userId,
          now,
        );
      }
    });
  }

  async shouldReplaceSeedBootstrap(hasRemoteRecords: boolean): Promise<boolean> {
    if (!hasRemoteRecords || await this.getState('last_sync_at')) return false;
    const row = await this.database.getFirstAsync<{ total: number; changed: number }>(
      `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN local_updated_at <> ? THEN 1 ELSE 0 END),0) AS changed
       FROM sync_outbox`,
      SEED_TIME,
    );
    return (row?.total ?? 0) > 0 && (row?.changed ?? 0) === 0;
  }

  async listOutbox(limit = 250): Promise<OutboxRecord[]> {
    const records = await this.database.getAllAsync<{
      id: string;
      table_name: string;
      record_id: string;
      payload_json: string;
      local_updated_at: string;
    }>('SELECT id,table_name,record_id,payload_json,local_updated_at FROM sync_outbox ORDER BY created_at LIMIT ?', limit);
    return records.map((record) => {
      if (!isSyncTableName(record.table_name)) {
        throw new Error(`지원하지 않는 동기화 대기 테이블입니다: ${record.table_name}`);
      }
      return {
        id: record.id,
        tableName: record.table_name,
        recordId: record.record_id,
        payload: parseOutboxPayload(record.payload_json),
        localUpdatedAt: record.local_updated_at,
      };
    });
  }

  async pendingCount(): Promise<number> {
    const row = await this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sync_outbox');
    return row?.count ?? 0;
  }

  async removeOutbox(acknowledgements: readonly OutboxAcknowledgement[]): Promise<void> {
    if (acknowledgements.length === 0) return;
    const conditions = acknowledgements.map(() => '(id=? AND local_updated_at=?)').join(' OR ');
    const parameters = acknowledgements.flatMap((record) => [record.id, record.localUpdatedAt]);
    await this.database.runAsync(`DELETE FROM sync_outbox WHERE ${conditions}`, ...parameters);
  }

  async markPushFailure(ids: readonly string[], message: string): Promise<void> {
    if (ids.length === 0) return;
    await this.database.runAsync(
      `UPDATE sync_outbox SET attempts=attempts+1,last_error=? WHERE id IN (${sqlPlaceholders(ids.length)})`,
      message,
      ...ids,
    );
  }

  async getState(key: string): Promise<string | null> {
    const row = await this.database.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key=?', key);
    return row?.value ?? null;
  }

  async setState(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      `INSERT INTO sync_state (key,value,updated_at) VALUES (?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
      key,
      value,
      now,
    );
  }

  async listConflicts(limit = 50): Promise<SyncConflict[]> {
    const records = await this.database.getAllAsync<{
      id: string;
      table_name: string;
      record_id: string;
      local_payload_json: string | null;
      remote_payload_json: string;
      local_updated_at: string | null;
      remote_updated_at: string;
      winner: 'local' | 'remote';
      created_at: string;
    }>(
      `SELECT id,table_name,record_id,local_payload_json,remote_payload_json,
       local_updated_at,remote_updated_at,winner,created_at
       FROM sync_conflicts ORDER BY created_at DESC LIMIT ?`,
      limit,
    );
    return records.map((record) => ({
      id: record.id,
      tableName: record.table_name,
      recordId: record.record_id,
      localPayload: record.local_payload_json,
      remotePayload: record.remote_payload_json,
      localUpdatedAt: record.local_updated_at,
      remoteUpdatedAt: record.remote_updated_at,
      winner: record.winner,
      createdAt: record.created_at,
    }));
  }
}
