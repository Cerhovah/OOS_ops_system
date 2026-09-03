import type { SQLiteDatabase } from 'expo-sqlite';

import {
  APP_NAME,
  DEFAULT_CLOSE_NOTIFICATION_TIME,
  DEFAULT_DAY_END_TIME,
  DEFAULT_WEEK_START_DAY,
} from '@/constants/app';
import { dateKey, weekRange } from '@/domain/calculations';
import { syncTableDefinitions } from '@/sync/schema';

const DATABASE_VERSION = 4;
export const SEED_TIME = '2026-08-20T00:00:00.000+09:00';

const sqlNow = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const syncableSettingsSql = `(
  NEW.key IN (
    'week_start_day','day_end_time','close_notification_time','close_notification_enabled',
    'notification_always','timer_limit_notifications_enabled','time_zone',
    'ai_provider','ai_model','analysis_range_weeks','analysis_include_notes'
  ) OR NEW.key LIKE 'item_notification:%'
)`;

type SyncDefinition = (typeof syncTableDefinitions)[number];
const phase2SyncDefinitions = syncTableDefinitions.filter(
  (definition) => definition.name !== 'analysis_sessions' && definition.name !== 'ai_proposals',
);
const phase4SyncDefinitions = syncTableDefinitions.filter(
  (definition) => definition.name === 'analysis_sessions' || definition.name === 'ai_proposals' || definition.name === 'settings',
);

function payloadSql(columns: readonly string[], prefix: 'NEW.' | ''): string {
  return `json_object(${columns.map((column) => `'${column}', ${prefix}${column}`).join(', ')})`;
}

async function createSyncCapture(db: SQLiteDatabase, definitions: readonly SyncDefinition[]): Promise<void> {
  for (const definition of definitions) {
    const condition = definition.name === 'settings' ? ` AND ${syncableSettingsSql}` : '';
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
    const settingsFilter = definition.name === 'settings'
      ? `AND (key IN (
          'week_start_day','day_end_time','close_notification_time','close_notification_enabled',
          'notification_always','timer_limit_notifications_enabled','time_zone',
          'ai_provider','ai_model','analysis_range_weeks','analysis_include_notes'
        ) OR key LIKE 'item_notification:%')`
      : '';
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
  await createSyncCapture(db, phase2SyncDefinitions);
  await queueExistingData(db, phase2SyncDefinitions);
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
  await createSyncCapture(db, phase4SyncDefinitions);
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

export const accountSeeds = [
  ['seed-account-sleep', '수면', '#526D82', '기반', 0, 49 * 60],
  ['seed-account-morning', '기상 후 준비', '#7D8F69', '기반', 1, 4 * 60],
  ['seed-account-required', '필수 블록(월~토 1.5h)', '#8A6F4D', '기반', 2, 9 * 60],
  ['seed-account-life', '식사·세면·기본생활', '#B08B57', '기반', 3, 13 * 60],
  ['seed-account-exercise', '운동', '#3E7C59', '건강', 4, 4 * 60],
  ['seed-account-commute', '통학(양주↔개포)', '#6B728E', '이동', 5, 15 * 60],
  ['seed-account-transfer', '편입 학업', '#2457D6', '학업', 6, 24 * 60],
  ['seed-account-codyssey', '코디세이', '#5D4E8C', '학업', 7, 15 * 60],
  ['seed-account-product', '개인제품·창업·시장검증', '#9B4D32', '제품', 8, 13 * 60],
  ['seed-account-career', 'AI·진로 옵션관리', '#46647A', '진로', 9, 2 * 60],
  ['seed-account-social', '봉사·사회접촉', '#8C5A72', '사회', 10, 4 * 60],
  ['seed-account-leisure', '유한 여가', '#3D7B80', '여가', 11, 6 * 60],
  ['seed-account-landing', '착륙·저자극 전환', '#697A5D', '기반', 12, 4 * 60],
  ['seed-account-buffer', '미예약 버퍼', '#767676', '버퍼', 13, 6 * 60],
] as const;

export const projectSeeds = [
  ['seed-project-transfer', '2027 편입', '편입 준비 결과물', null, null],
  ['seed-project-product', 'AI 제품 실험', '제품·시장 검증 결과물', '첫 사용자 흐름 검증', null],
] as const;

export const itemSeeds = [
  ['seed-item-study', 'seed-account-transfer', 'seed-project-transfer', '편입 공부', 'time', null, 120, 240, 270, 60, 0, 0],
  ['seed-item-exercise', 'seed-account-exercise', null, '운동', 'time', null, null, 60, 90, 60, 1, 1],
  ['seed-item-codyssey', 'seed-account-codyssey', null, '코디세이 미션', 'completion', null, null, 1, null, null, 0, 2],
  ['seed-item-commute', 'seed-account-commute', null, '통학', 'time', null, null, 225, null, 225, 0, 3],
  ['seed-item-required', 'seed-account-required', null, '필수 일정', 'time', null, null, 90, null, 90, 0, 4],
  ['seed-item-product', 'seed-account-product', 'seed-project-product', '개인 프로젝트', 'time', null, null, 120, null, 60, 0, 5],
  ['seed-item-payment', 'seed-account-product', 'seed-project-product', '유료 결제', 'event', 'KRW', null, null, null, null, 0, 6],
  ['seed-item-weight', 'seed-account-life', null, '체중', 'numeric', 'kg', null, null, null, null, 0, 7],
] as const;

export const scheduleSeeds = [
  ['seed-schedule-codyssey', 'seed-item-codyssey', (1 << 0) | (1 << 1), 1],
  ['seed-schedule-commute', 'seed-item-commute', (1 << 0) | (1 << 1) | (1 << 3) | (1 << 4), 225],
  ['seed-schedule-required', 'seed-item-required', 0b0111111, 90],
] as const;

export const kpiSeeds = [
  ['seed-kpi-study-set', 'seed-project-transfer', 'custom:problem_sets', '문제풀이 세트', '세트', 'sum', 0],
  ['seed-kpi-review-rate', 'seed-project-transfer', 'custom:review_rate', '오답 재풀이율', '%', 'last', 1],
  ['seed-kpi-mock-score', 'seed-project-transfer', 'custom:mock_score', '모의점수', '점', 'last', 2],
  ['seed-kpi-deploys', 'seed-project-product', 'deploys', '배포됨', '회', 'sum', 0],
  ['seed-kpi-users', 'seed-project-product', 'unique_users', '고유 사용자', '명', 'last', 1],
  ['seed-kpi-returning', 'seed-project-product', 'returning_users', '재방문 사용자', '명', 'last', 2],
  ['seed-kpi-payments', 'seed-project-product', 'payments', '유료 사용자', '명', 'last', 3],
  ['seed-kpi-revenue', 'seed-project-product', 'revenue', '매출', 'KRW', 'sum', 4],
] as const;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion > DATABASE_VERSION) {
    throw new Error(`지원하지 않는 데이터베이스 버전입니다: ${currentVersion}`);
  }
  if (currentVersion === 0) {
    await db.execAsync(`
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
    await seedDatabase(db);
    await db.execAsync('PRAGMA user_version = 1');
    currentVersion = 1;
  }
  if (currentVersion < 2) {
    await migrateToVersion2(db);
    await db.execAsync('PRAGMA user_version = 2');
    currentVersion = 2;
  }
  if (currentVersion < 3) {
    await migrateToVersion3(db);
    await db.execAsync('PRAGMA user_version = 3');
    currentVersion = 3;
  }
  if (currentVersion < 4) {
    await migrateToVersion4(db);
    await db.execAsync('PRAGMA user_version = 4');
  }
}

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM accounts');
  if ((count?.count ?? 0) > 0) return;
  const currentWeek = weekRange(dateKey(new Date())).start;
  const planColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(weekly_plans)');
  const hasSyncColumns = planColumns.some((column) => column.name === 'updated_at');

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const [id, name, color, kind, sortOrder] of accountSeeds) {
      await txn.runAsync(
        'INSERT INTO accounts (id,name,color,kind,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        id,
        name,
        color,
        kind,
        sortOrder,
        SEED_TIME,
        SEED_TIME,
      );
    }
    for (const [id, name, description, currentExperiment, nextDecisionDate] of projectSeeds) {
      await txn.runAsync(
        'INSERT INTO projects (id,name,description,current_experiment,next_decision_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        id,
        name,
        description,
        currentExperiment,
        nextDecisionDate,
        SEED_TIME,
        SEED_TIME,
      );
    }
    for (const seed of itemSeeds) {
      await txn.runAsync(
        `INSERT INTO items
          (id,account_id,project_id,name,type,unit,level_min,level_target,level_max,default_duration_min,count_on_complete,sort_order,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ...seed,
        SEED_TIME,
        SEED_TIME,
      );
    }
    for (const [id, itemId, weekdayMask, plannedValue] of scheduleSeeds) {
      await txn.runAsync(
        'INSERT INTO item_schedules (id,item_id,weekday_mask,planned_value,auto_create,created_at,updated_at) VALUES (?,?,?,?,1,?,?)',
        id,
        itemId,
        weekdayMask,
        plannedValue,
        SEED_TIME,
        SEED_TIME,
      );
    }
    for (const seed of kpiSeeds) {
      await txn.runAsync(
        'INSERT INTO project_kpis (id,project_id,key,label,unit,aggregation,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        ...seed,
        SEED_TIME,
        SEED_TIME,
      );
    }
    const planId = `seed-plan-${currentWeek}-v1`;
    if (hasSyncColumns) {
      await txn.runAsync(
        'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at,updated_at) VALUES (?,?,1,NULL,?,?,?)',
        planId,
        currentWeek,
        'app',
        SEED_TIME,
        SEED_TIME,
      );
    } else {
      await txn.runAsync(
        'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at) VALUES (?,?,1,NULL,?,?)',
        planId,
        currentWeek,
        'app',
        SEED_TIME,
      );
    }
    for (const [accountId, , , , , plannedMinutes] of accountSeeds) {
      if (hasSyncColumns) {
        await txn.runAsync(
          'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at) VALUES (?,?,?,?,?,?)',
          `${planId}-${accountId}`,
          planId,
          accountId,
          plannedMinutes,
          SEED_TIME,
          SEED_TIME,
        );
      } else {
        await txn.runAsync(
          'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes) VALUES (?,?,?,?)',
          `${planId}-${accountId}`,
          planId,
          accountId,
          plannedMinutes,
        );
      }
    }
    const settings = [
      ['week_start_day', String(DEFAULT_WEEK_START_DAY)],
      ['day_end_time', DEFAULT_DAY_END_TIME],
      ['close_notification_time', DEFAULT_CLOSE_NOTIFICATION_TIME],
      ['close_notification_enabled', '1'],
      ['notification_always', '0'],
      ['notification_permission_requested', '0'],
      ['timer_limit_notifications_enabled', '0'],
      ['analysis_range_weeks', '4'],
      ['analysis_include_notes', '1'],
      ['app_name', APP_NAME],
      ['time_zone', 'Asia/Seoul'],
    ];
    for (const [key, value] of settings) {
      await txn.runAsync('INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)', key, value, SEED_TIME);
    }
  });
}
