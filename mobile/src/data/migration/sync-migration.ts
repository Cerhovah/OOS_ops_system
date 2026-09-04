import type { SQLiteDatabase } from 'expo-sqlite';

import {
  SYNCABLE_SETTING_KEYS,
  SYNCABLE_SETTING_PREFIX,
  syncTableDefinitions,
} from '@/sync/schema';

const sqlNow = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const syncableSettingKeyListSql = SYNCABLE_SETTING_KEYS.map((key) => `'${key}'`).join(',');

function syncableSettingsSql(prefix: 'NEW.' | ''): string {
  return `(${prefix}key IN (${syncableSettingKeyListSql}) OR substr(${prefix}key, 1, ${SYNCABLE_SETTING_PREFIX.length}) = '${SYNCABLE_SETTING_PREFIX}')`;
}

type SyncDefinition = (typeof syncTableDefinitions)[number];
const phase2SyncDefinitions = syncTableDefinitions.filter(
  (definition) => definition.name !== 'analysis_sessions' && definition.name !== 'ai_proposals',
);
const phase4SyncDefinitions = syncTableDefinitions.filter(
  (definition) => definition.name === 'analysis_sessions' || definition.name === 'ai_proposals' || definition.name === 'settings',
);
const settingsSyncDefinitions = syncTableDefinitions.filter((definition) => definition.name === 'settings');

function payloadSql(columns: readonly string[], prefix: 'NEW.' | ''): string {
  return `json_object(${columns.map((column) => `'${column}', ${prefix}${column}`).join(', ')})`;
}

async function createSyncCapture(db: SQLiteDatabase, definitions: readonly SyncDefinition[]): Promise<void> {
  for (const definition of definitions) {
    const condition = definition.name === 'settings' ? ` AND ${syncableSettingsSql('NEW.')}` : '';
    const payload = payloadSql(definition.columns, 'NEW.');
    const recordId = `NEW.${definition.primaryKey}`;
    const timestamp = `COALESCE(NEW.updated_at, ${sqlNow})`;
    for (const operation of ['insert', 'update'] as const) {
      await db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS sync_capture_${definition.name}_${operation}
        AFTER ${operation.toUpperCase()} ON ${definition.name}
        WHEN COALESCE((SELECT value FROM sync_state WHERE key='capture_suppressed'), '0') <> '1'${condition}
        BEGIN
          INSERT INTO sync_outbox
            (id,table_name,record_id,operation,payload_json,local_updated_at,attempts,last_error,created_at)
          VALUES
            (lower(hex(randomblob(16))),'${definition.name}',${recordId},'upsert',${payload},${timestamp},0,NULL,${sqlNow})
          ON CONFLICT(table_name,record_id) DO UPDATE SET
            operation='upsert', payload_json=excluded.payload_json,
            local_updated_at=excluded.local_updated_at, attempts=0, last_error=NULL;
        END;
      `);
    }
  }
}

async function queueExistingData(db: SQLiteDatabase, definitions: readonly SyncDefinition[]): Promise<void> {
  for (const definition of definitions) {
    const settingsFilter = definition.name === 'settings' ? `AND ${syncableSettingsSql('')}` : '';
    await db.execAsync(`
      INSERT INTO sync_outbox
        (id,table_name,record_id,operation,payload_json,local_updated_at,attempts,last_error,created_at)
      SELECT lower(hex(randomblob(16))),'${definition.name}',${definition.primaryKey},'upsert',
        ${payloadSql(definition.columns, '')},COALESCE(updated_at,${sqlNow}),0,NULL,${sqlNow}
      FROM ${definition.name}
      WHERE 1=1 ${settingsFilter}
      ON CONFLICT(table_name,record_id) DO UPDATE SET
        payload_json=excluded.payload_json,local_updated_at=excluded.local_updated_at,
        attempts=0,last_error=NULL;
    `);
  }
}

export async function installPhase2Sync(db: SQLiteDatabase): Promise<void> {
  await createSyncCapture(db, phase2SyncDefinitions);
  await queueExistingData(db, phase2SyncDefinitions);
}

export async function installPhase4Sync(db: SQLiteDatabase): Promise<void> {
  await createSyncCapture(db, phase4SyncDefinitions);
}

export async function installSettingsSync(db: SQLiteDatabase): Promise<void> {
  await createSyncCapture(db, settingsSyncDefinitions);
}
