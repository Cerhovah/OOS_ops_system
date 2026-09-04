import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_TIME } from '@/data/migration/seed-manifest';
import { seedDatabase } from '@/data/migration/seed-writer';
import {
  installPhase2Sync,
  installPhase4Sync,
  installSettingsSync,
} from '@/data/migration/sync-migration';

export {
  accountSeeds,
  itemSeeds,
  kpiSeeds,
  projectSeeds,
  scheduleSeeds,
  SEED_TIME,
} from '@/data/migration/seed-manifest';
export { seedDatabase } from '@/data/migration/seed-writer';

const DATABASE_VERSION = 6;

const sqlNow = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

async function migrateToVersion2(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE weekly_plans ADD COLUMN updated_at TEXT;
    ALTER TABLE weekly_plans ADD COLUMN deleted_at TEXT;
    ALTER TABLE weekly_plan_lines ADD COLUMN created_at TEXT;
    ALTER TABLE weekly_plan_lines ADD COLUMN updated_at TEXT;
    ALTER TABLE weekly_plan_lines ADD COLUMN deleted_at TEXT;
    ALTER TABLE day_notes ADD COLUMN deleted_at TEXT;
    ALTER TABLE day_closures ADD COLUMN updated_at TEXT;
    ALTER TABLE day_closures ADD COLUMN deleted_at TEXT;
    ALTER TABLE weekly_comments ADD COLUMN deleted_at TEXT;
    ALTER TABLE today_item_additions ADD COLUMN updated_at TEXT;
    ALTER TABLE today_item_additions ADD COLUMN deleted_at TEXT;

    UPDATE weekly_plans SET updated_at=created_at WHERE updated_at IS NULL;
    UPDATE weekly_plan_lines
      SET created_at=COALESCE((SELECT created_at FROM weekly_plans WHERE id=weekly_plan_id), ${sqlNow}),
          updated_at=COALESCE((SELECT created_at FROM weekly_plans WHERE id=weekly_plan_id), ${sqlNow})
      WHERE updated_at IS NULL;
    UPDATE day_closures SET updated_at=closed_at WHERE updated_at IS NULL;
    UPDATE today_item_additions SET updated_at=created_at WHERE updated_at IS NULL;

    CREATE TABLE sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE sync_outbox (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('upsert')),
      payload_json TEXT NOT NULL,
      local_updated_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(table_name,record_id)
    );
    CREATE TABLE sync_conflicts (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_payload_json TEXT,
      remote_payload_json TEXT NOT NULL,
      local_updated_at TEXT,
      remote_updated_at TEXT NOT NULL,
      winner TEXT NOT NULL CHECK (winner IN ('local','remote')),
      created_at TEXT NOT NULL,
      resolved_at TEXT NOT NULL
    );
    CREATE INDEX idx_sync_outbox_created ON sync_outbox(created_at);
    CREATE INDEX idx_sync_conflicts_created ON sync_conflicts(created_at DESC);
  `);
  await installPhase2Sync(db);
}

async function migrateToVersion3(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS analysis_sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK (mode IN ('audit','pattern','project','optimize','longterm','free')),
      question TEXT,
      range_start TEXT NOT NULL,
      range_end TEXT NOT NULL,
      data_snapshot_json TEXT NOT NULL,
      response_text TEXT,
      provider TEXT,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      estimated_cost_usd REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_proposals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
      kind TEXT NOT NULL CHECK (kind IN ('plan_change')),
      payload_json TEXT NOT NULL,
      rationale TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','dismissed')),
      applied_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created ON analysis_sessions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_proposals_session ON ai_proposals(session_id, created_at);

    DROP TRIGGER IF EXISTS sync_capture_settings_insert;
    DROP TRIGGER IF EXISTS sync_capture_settings_update;
  `);
  await installPhase4Sync(db);
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('analysis_range_weeks','4',?)",
    now,
  );
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('analysis_include_notes','1',?)",
    now,
  );
}

async function migrateToVersion4(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('ai_provider','openai',?)",
    SEED_TIME,
  );
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES ('ai_model','gpt-5.6-terra',?)",
    SEED_TIME,
  );
}

async function migrateToVersion5(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DROP TRIGGER IF EXISTS sync_capture_settings_insert;
    DROP TRIGGER IF EXISTS sync_capture_settings_update;
  `);
  await installSettingsSync(db);
}

async function migrateToVersion6(db: SQLiteDatabase): Promise<void> {
  const existing = new Set((await db.getAllAsync<{ name: string }>('PRAGMA table_info(analysis_sessions)')).map((row) => row.name));
  const additions = [
    ['reasoning_effort', 'TEXT'], ['total_tokens', 'INTEGER'], ['provider_response_id', 'TEXT'],
    ['started_at', 'TEXT'], ['finished_at', 'TEXT'],
  ].filter(([name]) => !existing.has(name));
  await db.execAsync(`
    ${additions.map(([name, type]) => `ALTER TABLE analysis_sessions ADD COLUMN ${name} ${type};`).join('\n')}
    UPDATE analysis_sessions SET total_tokens=input_tokens + output_tokens
      WHERE total_tokens IS NULL AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL;
    DROP TRIGGER IF EXISTS sync_capture_analysis_sessions_insert;
    DROP TRIGGER IF EXISTS sync_capture_analysis_sessions_update;
  `);
  await installPhase4Sync(db);
}

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion > DATABASE_VERSION) {
    throw new Error(`지원하지 않는 데이터베이스 버전입니다: ${currentVersion}`);
  }
  if (currentVersion === 0) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, kind TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
        current_experiment TEXT, next_decision_date TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE items (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
        project_id TEXT REFERENCES projects(id), name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('time','completion','count','numeric','event')),
        unit TEXT, level_min REAL, level_target REAL, level_max REAL,
        default_duration_min INTEGER, count_on_complete INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE item_schedules (
        id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id),
        weekday_mask INTEGER NOT NULL, planned_value REAL, start_time TEXT,
        auto_create INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE project_kpis (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
        key TEXT NOT NULL, label TEXT NOT NULL, unit TEXT,
        aggregation TEXT NOT NULL DEFAULT 'sum' CHECK (aggregation IN ('sum','last','max')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE project_kpi_records (
        id TEXT PRIMARY KEY, kpi_id TEXT NOT NULL REFERENCES project_kpis(id),
        value REAL NOT NULL, occurred_at TEXT NOT NULL, note TEXT,
        source TEXT NOT NULL DEFAULT 'app',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE weekly_plans (
        id TEXT PRIMARY KEY, week_start TEXT NOT NULL, version INTEGER NOT NULL,
        note TEXT, source TEXT NOT NULL DEFAULT 'app', created_at TEXT NOT NULL,
        UNIQUE(week_start, version)
      );
      CREATE TABLE weekly_plan_lines (
        id TEXT PRIMARY KEY, weekly_plan_id TEXT NOT NULL REFERENCES weekly_plans(id),
        account_id TEXT NOT NULL REFERENCES accounts(id), planned_minutes INTEGER NOT NULL
      );
      CREATE TABLE entries (
        id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id),
        account_id TEXT NOT NULL REFERENCES accounts(id), type TEXT NOT NULL,
        started_at TEXT, ended_at TEXT, duration_min INTEGER, value REAL, count INTEGER,
        occurred_at TEXT NOT NULL, note TEXT, source TEXT NOT NULL DEFAULT 'app',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE TABLE day_notes (
        id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, text TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE day_closures (
        id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, closed_at TEXT NOT NULL,
        planned_minutes INTEGER NOT NULL, actual_minutes INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL, note TEXT
      );
      CREATE TABLE weekly_comments (
        id TEXT PRIMARY KEY, week_start TEXT NOT NULL UNIQUE, text TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE today_item_additions (
        id TEXT PRIMARY KEY, date TEXT NOT NULL, item_id TEXT NOT NULL REFERENCES items(id),
        created_at TEXT NOT NULL, UNIQUE(date, item_id)
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX idx_entries_occurred ON entries(occurred_at);
      CREATE INDEX idx_entries_account ON entries(account_id, occurred_at);
      CREATE INDEX idx_entries_item ON entries(item_id, occurred_at);
      CREATE INDEX idx_schedules_item ON item_schedules(item_id);
      CREATE INDEX idx_plan_week ON weekly_plans(week_start, version DESC);
      CREATE INDEX idx_kpi_records_kpi ON project_kpi_records(kpi_id, occurred_at);
      `);
      await seedDatabase(transaction);
      await transaction.execAsync('PRAGMA user_version = 1');
    });
    currentVersion = 1;
  }
  if (currentVersion < 2) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrateToVersion2(transaction);
      await transaction.execAsync('PRAGMA user_version = 2');
    });
    currentVersion = 2;
  }
  if (currentVersion < 3) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrateToVersion3(transaction);
      await transaction.execAsync('PRAGMA user_version = 3');
    });
    currentVersion = 3;
  }
  if (currentVersion < 4) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrateToVersion4(transaction);
      await transaction.execAsync('PRAGMA user_version = 4');
    });
    currentVersion = 4;
  }
  if (currentVersion < 5) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrateToVersion5(transaction);
      await transaction.execAsync('PRAGMA user_version = 5');
    });
    currentVersion = 5;
  }
  if (currentVersion < 6) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrateToVersion6(transaction);
      await transaction.execAsync('PRAGMA user_version = 6');
    });
  }
}
