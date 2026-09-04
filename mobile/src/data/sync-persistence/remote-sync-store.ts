import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeRemotePayload } from '@/data/sync-persistence/record-codec';
import { sqlPlaceholders } from '@/data/sync-persistence/sql';
import type { RemoteSyncRecord, SyncRow } from '@/data/sync-persistence/types';
import { decideMerge } from '@/sync/merge';
import {
  getSyncTableDefinition,
  isSyncableSetting,
  SYNC_BOOTSTRAP_SETTING_KEYS,
  SYNCABLE_SETTING_PREFIX,
  syncTableDefinitions,
  type SyncTableName,
} from '@/sync/schema';

export class RemoteSyncStore {
  constructor(private readonly database: SQLiteDatabase) {}

  async applyRecords(
    records: readonly RemoteSyncRecord[],
    options: { replaceSeedBootstrap?: boolean } = {},
  ): Promise<void> {
    const order = new Map(syncTableDefinitions.map((definition, index) => [definition.name, index]));
    const sorted = [...records].sort(
      (left, right) => (order.get(left.table_name as SyncTableName) ?? 999) - (order.get(right.table_name as SyncTableName) ?? 999),
    );

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
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
          DELETE FROM sync_outbox;
          DELETE FROM sync_conflicts;
        `);
        await transaction.runAsync(
          `DELETE FROM settings
           WHERE key IN (${sqlPlaceholders(SYNC_BOOTSTRAP_SETTING_KEYS.length)})
              OR substr(key, 1, ?) = ?`,
          ...SYNC_BOOTSTRAP_SETTING_KEYS,
          SYNCABLE_SETTING_PREFIX.length,
          SYNCABLE_SETTING_PREFIX,
        );
      }

      for (const remote of sorted) {
        const definition = getSyncTableDefinition(remote.table_name);
        if (!definition) {
          throw new Error(`지원하지 않는 원격 동기화 테이블입니다: ${remote.table_name}`);
        }
        if (definition.name === 'settings' && !isSyncableSetting(remote.local_id)) {
          throw new Error(`지원하지 않는 원격 동기화 설정입니다: ${remote.local_id}`);
        }
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
            `INSERT INTO ${definition.name} (${columns.join(',')}) VALUES (${sqlPlaceholders(columns.length)})
             ON CONFLICT(${definition.primaryKey}) DO UPDATE SET
             ${updateColumns.map((column) => `${column}=excluded.${column}`).join(',')}`,
            ...columns.map((column) => payload[column]),
          );
          await transaction.runAsync(
            'DELETE FROM sync_outbox WHERE table_name=? AND record_id=?',
            definition.name,
            remote.local_id,
          );
        } else if (decision.winner === 'same') {
          await transaction.runAsync(
            'DELETE FROM sync_outbox WHERE table_name=? AND record_id=?',
            definition.name,
            remote.local_id,
          );
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
