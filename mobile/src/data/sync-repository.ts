import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_TIME } from '@/data/migrations';
import { decideMerge } from '@/sync/merge';
import {
  getSyncTableDefinition,
  isSyncableSetting,
  isSyncTableName,
  syncTableDefinitions,
  type SyncScalar,
  type SyncTableDefinition,
  type SyncTableName,
} from '@/sync/schema';

type SyncRow = Record<string, SyncScalar>;

interface OutboxRecord {
  id: string;
  tableName: SyncTableName;
  recordId: string;
  payload: Record<string, SyncScalar>;
  localUpdatedAt: string;
}

export interface RemoteSyncRecord {
  user_id: string;
  table_name: string;
  local_id: string;
  payload: Record<string, unknown>;
  client_updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

export interface SyncConflict {
  id: string;
  tableName: string;
  recordId: string;
  localPayload: string | null;
  remotePayload: string;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string;
  winner: 'local' | 'remote';
  createdAt: string;
}

function asSyncScalar(value: unknown): SyncScalar {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value;
  throw new Error('동기화 행에 지원하지 않는 값이 있습니다.');
}

function parsePayload(value: string): Record<string, SyncScalar> {
  const parsed: unknown = JSON.parse(value);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('동기화 대기 데이터 형식이 올바르지 않습니다.');
  }
  return Object.fromEntries(Object.entries(parsed).map(([key, nested]) => [key, asSyncScalar(nested)]));
}

function normalizeRemotePayload(
  definition: SyncTableDefinition,
  recordId: string,
  payload: Readonly<Record<string, unknown>>,
): Record<string, SyncScalar> {
  const normalized: Record<string, SyncScalar> = {};
  for (const column of definition.columns) {
    if (column === definition.primaryKey) {
      normalized[column] = recordId;
    } else if (Object.hasOwn(payload, column)) {
      normalized[column] = asSyncScalar(payload[column]);
    }
  }
  if (definition.columns.some((column) => !Object.hasOwn(normalized, column))) {
    throw new Error(`${definition.name} 원격 행에 필요한 열이 없습니다.`);
  }
  return normalized;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}

export class SyncRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async shouldReplaceSeedBootstrap(hasRemoteRecords: boolean): Promise<boolean> {
    if (!hasRemoteRecords || await this.getState('last_sync_at')) return false;
    const row = await this.db.getFirstAsync<{ total: number; changed: number }>(
      `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN local_updated_at <> ? THEN 1 ELSE 0 END),0) AS changed
       FROM sync_outbox`,
      SEED_TIME,
    );
    return (row?.total ?? 0) > 0 && (row?.changed ?? 0) === 0;
  }

  async listOutbox(limit = 250): Promise<OutboxRecord[]> {
    const records = await this.db.getAllAsync<{
      id: string;
      table_name: string;
      record_id: string;
      payload_json: string;
      local_updated_at: string;
    }>('SELECT id,table_name,record_id,payload_json,local_updated_at FROM sync_outbox ORDER BY created_at LIMIT ?', limit);
    return records.flatMap((record) => {
      if (!isSyncTableName(record.table_name)) return [];
      return [{
        id: record.id,
        tableName: record.table_name,
        recordId: record.record_id,
        payload: parsePayload(record.payload_json),
        localUpdatedAt: record.local_updated_at,
      }];
    });
  }

  async pendingCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sync_outbox');
    return row?.count ?? 0;
  }

  async removeOutbox(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.runAsync(`DELETE FROM sync_outbox WHERE id IN (${placeholders(ids.length)})`, ...ids);
  }

  async markPushFailure(ids: readonly string[], message: string): Promise<void> {
    if (ids.length === 0) return;
    await this.db.runAsync(
      `UPDATE sync_outbox SET attempts=attempts+1,last_error=? WHERE id IN (${placeholders(ids.length)})`,
      message,
      ...ids,
    );
  }

  async getState(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key=?', key);
    return row?.value ?? null;
  }

  async setState(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO sync_state (key,value,updated_at) VALUES (?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
      key,
      value,
      now,
    );
  }

  async listConflicts(limit = 50): Promise<SyncConflict[]> {
    const records = await this.db.getAllAsync<{
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

  async applyRemoteRecords(
    records: readonly RemoteSyncRecord[],
    options: { replaceSeedBootstrap?: boolean } = {},
  ): Promise<void> {
    const order = new Map(syncTableDefinitions.map((definition, index) => [definition.name, index]));
    const sorted = [...records].sort(
      (left, right) => (order.get(left.table_name as SyncTableName) ?? 999) - (order.get(right.table_name as SyncTableName) ?? 999),
    );

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const now = new Date().toISOString();
      await transaction.runAsync(
        `INSERT INTO sync_state (key,value,updated_at) VALUES ('capture_suppressed','1',?)
         ON CONFLICT(key) DO UPDATE SET value='1',updated_at=excluded.updated_at`,
        now,
      );

      if (options.replaceSeedBootstrap) {
        await transaction.execAsync(`
          DELETE FROM project_kpi_records;
          DELETE FROM entries;
          DELETE FROM item_schedules;
          DELETE FROM today_item_additions;
          DELETE FROM weekly_plan_lines;
          DELETE FROM weekly_plans;
          DELETE FROM day_notes;
          DELETE FROM day_closures;
          DELETE FROM weekly_comments;
          DELETE FROM project_kpis;
          DELETE FROM items;
          DELETE FROM projects;
          DELETE FROM accounts;
          DELETE FROM settings WHERE key IN (
            'week_start_day','day_end_time','close_notification_time','close_notification_enabled',
            'notification_always','timer_limit_notifications_enabled','time_zone'
          ) OR key LIKE 'item_notification:%';
          DELETE FROM sync_outbox;
          DELETE FROM sync_conflicts;
        `);
      }

      for (const remote of sorted) {
        const definition = getSyncTableDefinition(remote.table_name);
        if (!definition) continue;
        if (definition.name === 'settings' && !isSyncableSetting(remote.local_id)) continue;
        const payload = normalizeRemotePayload(definition, remote.local_id, remote.payload);
        const local = await transaction.getFirstAsync<SyncRow>(
          `SELECT ${definition.columns.join(',')} FROM ${definition.name} WHERE ${definition.primaryKey}=?`,
          remote.local_id,
        );
        const pending = await transaction.getFirstAsync<{ id: string; local_updated_at: string }>(
          'SELECT id,local_updated_at FROM sync_outbox WHERE table_name=? AND record_id=?',
          definition.name,
          remote.local_id,
        );
        const localUpdatedAt = local?.updated_at === null || local?.updated_at === undefined
          ? (pending?.local_updated_at ?? null)
          : String(local.updated_at);
        const decision = decideMerge({
          localPayload: local ?? null,
          localUpdatedAt,
          remotePayload: payload,
          remoteUpdatedAt: remote.client_updated_at,
          hasPendingLocal: Boolean(pending),
        });

        if (decision.conflict) {
          await transaction.runAsync(
            `INSERT INTO sync_conflicts
             (id,table_name,record_id,local_payload_json,remote_payload_json,local_updated_at,
              remote_updated_at,winner,created_at,resolved_at)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            randomUUID(),
            definition.name,
            remote.local_id,
            local ? JSON.stringify(local) : null,
            JSON.stringify(payload),
            localUpdatedAt,
            remote.client_updated_at,
            decision.winner,
            now,
            now,
          );
        }

        if (decision.winner === 'remote') {
          const columns = definition.columns;
          const updateColumns = columns.filter((column) => column !== definition.primaryKey);
          await transaction.runAsync(
            `INSERT INTO ${definition.name} (${columns.join(',')}) VALUES (${placeholders(columns.length)})
             ON CONFLICT(${definition.primaryKey}) DO UPDATE SET
             ${updateColumns.map((column) => `${column}=excluded.${column}`).join(',')}`,
            ...columns.map((column) => payload[column]),
          );
          await transaction.runAsync('DELETE FROM sync_outbox WHERE table_name=? AND record_id=?', definition.name, remote.local_id);
        } else if (decision.winner === 'same') {
          await transaction.runAsync('DELETE FROM sync_outbox WHERE table_name=? AND record_id=?', definition.name, remote.local_id);
        }
      }

      await transaction.runAsync(
        `INSERT INTO sync_state (key,value,updated_at) VALUES ('capture_suppressed','0',?)
         ON CONFLICT(key) DO UPDATE SET value='0',updated_at=excluded.updated_at`,
        now,
      );
    });
  }
}
