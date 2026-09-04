/// <reference types="node" />

import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { TestSQLiteDatabase } from '@/test/sqlite-adapter';

import { accountSeeds, itemSeeds, kpiSeeds, migrateDatabase, projectSeeds, scheduleSeeds } from './migrations';
import { SyncRepository, type RemoteSyncRecord } from './sync-repository';

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));

describe('Phase 1 seed manifest', () => {
  it('contains the exact 14-account 168-hour allocation from SPEC 4.4', () => {
    expect(accountSeeds.map((seed) => seed[1])).toEqual([
      '수면',
      '기상 후 준비',
      '필수 블록(월~토 1.5h)',
      '식사·세면·기본생활',
      '운동',
      '통학(양주↔개포)',
      '편입 학업',
      '코디세이',
      '개인제품·창업·시장검증',
      'AI·진로 옵션관리',
      '봉사·사회접촉',
      '유한 여가',
      '착륙·저자극 전환',
      '미예약 버퍼',
    ]);
    expect(accountSeeds.map((seed) => seed[5] / 60)).toEqual([49, 4, 9, 13, 4, 15, 24, 15, 13, 2, 4, 6, 4, 6]);
    expect(accountSeeds.reduce((total, seed) => total + seed[5], 0)).toBe(168 * 60);
  });

  it('contains every specified item and both projects with their KPI seeds', () => {
    expect(itemSeeds.map((seed) => seed[3])).toEqual([
      '편입 공부',
      '운동',
      '코디세이 미션',
      '통학',
      '필수 일정',
      '개인 프로젝트',
      '유료 결제',
      '체중',
    ]);
    expect(projectSeeds.map((seed) => seed[1])).toEqual(['2027 편입', 'AI 제품 실험']);
    expect(kpiSeeds.map((seed) => seed[3])).toEqual([
      '문제풀이 세트',
      '오답 재풀이율',
      '모의점수',
      '배포됨',
      '고유 사용자',
      '재방문 사용자',
      '유료 사용자',
      '매출',
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-study')?.slice(4, 10)).toEqual([
      'time', null, 120, 240, 270, 60,
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-exercise')?.slice(4, 11)).toEqual([
      'time', null, null, 60, 90, 60, 1,
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-payment')?.slice(4, 6)).toEqual(['event', 'KRW']);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-weight')?.slice(4, 6)).toEqual(['numeric', 'kg']);
  });

  it('uses the specified Monday/Tuesday and commute weekday masks without duplicates', () => {
    expect(new Set(scheduleSeeds.map((seed) => seed[1])).size).toBe(scheduleSeeds.length);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-codyssey')?.[2]).toBe(0b0000011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-commute')?.[2]).toBe(0b0011011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-required')?.[2]).toBe(0b0111111);
  });

  it('creates the additive analysis schema, provider defaults, and captures later mutations', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());

    expect(db.raw.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 6 });
    expect(db.raw.prepare("SELECT value FROM settings WHERE key='ai_provider'").get()).toMatchObject({ value: 'openai' });
    expect(db.raw.prepare("SELECT value FROM settings WHERE key='ai_model'").get()).toMatchObject({ value: 'gpt-5.6-terra' });
    const initial = db.raw.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get() as { count: number };
    expect(initial.count).toBeGreaterThan(0);

    db.raw.prepare("UPDATE accounts SET name='수면 수정',updated_at='2026-09-02T01:00:00.000Z' WHERE id='seed-account-sleep'").run();
    const captured = db.raw.prepare(
      "SELECT payload_json,local_updated_at FROM sync_outbox WHERE table_name='accounts' AND record_id='seed-account-sleep'",
    ).get() as { payload_json: string; local_updated_at: string };
    expect(JSON.parse(captured.payload_json)).toMatchObject({ id: 'seed-account-sleep', name: '수면 수정' });
    expect(captured.local_updated_at).toBe('2026-09-02T01:00:00.000Z');

    db.raw.prepare(
      `INSERT INTO analysis_sessions
        (id,mode,question,range_start,range_end,data_snapshot_json,response_text,provider,model,
         input_tokens,output_tokens,estimated_cost_usd,created_at,updated_at)
       VALUES ('session-1','audit',NULL,'2026-08-01','2026-09-01','{}',NULL,NULL,NULL,NULL,NULL,NULL,
         '2026-09-04T00:00:00.000Z','2026-09-04T00:00:00.000Z')`,
    ).run();
    expect(db.raw.prepare(
      "SELECT table_name FROM sync_outbox WHERE table_name='analysis_sessions' AND record_id='session-1'",
    ).get()).toMatchObject({ table_name: 'analysis_sessions' });
    db.raw.close();
  });

  it('rolls back a partially executed migration together with its user_version', async () => {
    const db = new TestSQLiteDatabase();
    const originalExec = db.execAsync.bind(db);
    let injected = false;
    const failure = vi.spyOn(db, 'execAsync').mockImplementation(async (source) => {
      if (!injected && source.includes('ALTER TABLE weekly_plans ADD COLUMN updated_at')) {
        injected = true;
        db.raw.exec('ALTER TABLE weekly_plans ADD COLUMN updated_at TEXT;');
        throw new Error('injected migration interruption');
      }
      await originalExec(source);
    });

    await expect(migrateDatabase(db.asExpoDatabase())).rejects.toThrow('injected migration interruption');
    expect(db.raw.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 1 });
    expect(db.raw.prepare('PRAGMA table_info(weekly_plans)').all()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'updated_at' })]),
    );

    failure.mockRestore();
    await migrateDatabase(db.asExpoDatabase());
    expect(db.raw.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 6 });
    db.close();
  });

  it('replaces legacy settings triggers when upgrading an existing v4 database', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());
    db.raw.exec(`
      DROP TRIGGER sync_capture_settings_insert;
      DROP TRIGGER sync_capture_settings_update;
      CREATE TRIGGER sync_capture_settings_insert AFTER INSERT ON settings
      WHEN NEW.key LIKE 'item_notification:%' BEGIN SELECT 1; END;
      CREATE TRIGGER sync_capture_settings_update AFTER UPDATE ON settings
      WHEN NEW.key LIKE 'item_notification:%' BEGIN SELECT 1; END;
      PRAGMA user_version = 4;
    `);

    await migrateDatabase(db.asExpoDatabase());

    expect(db.raw.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 6 });
    const triggerSql = db.raw.prepare(
      "SELECT group_concat(sql, '\n') AS sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'sync_capture_settings_%'",
    ).get() as { sql: string };
    expect(triggerSql.sql).toContain("substr(NEW.key, 1, 18) = 'item_notification:'");
    expect(triggerSql.sql).not.toContain("NEW.key LIKE 'item_notification:%'");

    db.raw.exec('DELETE FROM sync_outbox;');
    db.raw.prepare(
      "INSERT INTO settings (key,value,updated_at) VALUES ('itemXnotification:not-a-prefix','keep',?)",
    ).run('2026-09-04T02:00:00.000Z');
    expect(db.raw.prepare(
      "SELECT COUNT(*) AS count FROM sync_outbox WHERE record_id='itemXnotification:not-a-prefix'",
    ).get()).toMatchObject({ count: 0 });
    db.raw.close();
  });

  it('applies a newer remote row, keeps a newer local row, and logs both conflicts', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());
    const repository = new SyncRepository(db.asExpoDatabase());
    const base = db.raw.prepare("SELECT * FROM accounts WHERE id='seed-account-sleep'").get() as Record<string, string | number | null>;

    const remoteWins: RemoteSyncRecord = {
      user_id: 'user-a',
      table_name: 'accounts',
      local_id: 'seed-account-sleep',
      payload: { ...base, name: '서버 수면', updated_at: '2026-09-02T02:00:00.000Z' },
      client_updated_at: '2026-09-02T02:00:00.000Z',
      deleted_at: null,
      server_updated_at: '2026-09-02T02:00:01.000Z',
    };
    await repository.applyRemoteRecords([remoteWins]);
    expect(db.raw.prepare("SELECT name FROM accounts WHERE id='seed-account-sleep'").get()).toMatchObject({ name: '서버 수면' });

    db.raw.prepare(
      "UPDATE accounts SET name='기기 수면',updated_at='2026-09-02T03:00:00.000Z' WHERE id='seed-account-sleep'",
    ).run();
    const localWins: RemoteSyncRecord = {
      ...remoteWins,
      payload: { ...base, name: '이전 서버 수면', updated_at: '2026-09-02T02:30:00.000Z' },
      client_updated_at: '2026-09-02T02:30:00.000Z',
      server_updated_at: '2026-09-02T02:30:01.000Z',
    };
    await repository.applyRemoteRecords([localWins]);

    expect(db.raw.prepare("SELECT name FROM accounts WHERE id='seed-account-sleep'").get()).toMatchObject({ name: '기기 수면' });
    expect(db.raw.prepare("SELECT COUNT(*) AS count FROM sync_conflicts WHERE record_id='seed-account-sleep'").get()).toMatchObject({ count: 2 });
    expect(db.raw.prepare("SELECT COUNT(*) AS count FROM sync_conflicts WHERE record_id='seed-account-sleep' AND winner='local'").get()).toMatchObject({ count: 1 });
    expect(db.raw.prepare("SELECT COUNT(*) AS count FROM sync_outbox WHERE record_id='seed-account-sleep'").get()).toMatchObject({ count: 1 });
    db.raw.close();
  });

  it('restores a remote analysis session before its proposal regardless of response order', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());
    const repository = new SyncRepository(db.asExpoDatabase());
    const timestamp = '2026-09-04T01:00:00.000Z';
    const remote = (tableName: 'analysis_sessions' | 'ai_proposals', localId: string, payload: Record<string, string | number | null>): RemoteSyncRecord => ({
      user_id: 'user-a',
      table_name: tableName,
      local_id: localId,
      payload,
      client_updated_at: timestamp,
      deleted_at: null,
      server_updated_at: timestamp,
    });

    await repository.applyRemoteRecords([
      remote('ai_proposals', 'proposal-remote', {
        id: 'proposal-remote', session_id: 'session-remote', kind: 'plan_change',
        payload_json: '{"weekStart":"2026-09-07","minutesByAccount":{"seed-account-sleep":2940},"note":null}',
        rationale: '원격 제안', status: 'pending', applied_at: null,
        created_at: timestamp, updated_at: timestamp, deleted_at: null,
      }),
      remote('analysis_sessions', 'session-remote', {
        id: 'session-remote', mode: 'audit', question: '원격 질문', range_start: '2026-08-01', range_end: '2026-09-01',
        data_snapshot_json: '{}', response_text: '원격 답변', provider: 'test', model: 'test',
        reasoning_effort: 'medium', input_tokens: 10, output_tokens: 5, total_tokens: 15, estimated_cost_usd: 0.001,
        provider_response_id: 'resp_remote', started_at: timestamp, finished_at: timestamp,
        created_at: timestamp, updated_at: timestamp, deleted_at: null,
      }),
    ]);

    expect(db.raw.prepare("SELECT question FROM analysis_sessions WHERE id='session-remote'").get()).toMatchObject({ question: '원격 질문' });
    expect(db.raw.prepare("SELECT session_id FROM ai_proposals WHERE id='proposal-remote'").get()).toMatchObject({ session_id: 'session-remote' });
    db.raw.close();
  });

  it('atomically replaces pristine install seeds when a remote backup exists', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());
    const repository = new SyncRepository(db.asExpoDatabase());
    const remoteAccount = db.raw.prepare(
      "SELECT * FROM accounts WHERE id='seed-account-sleep'",
    ).get() as Record<string, string | number | null>;
    expect(await repository.shouldReplaceSeedBootstrap(true)).toBe(true);
    db.raw.prepare(
      "INSERT INTO settings (key,value,updated_at) VALUES ('item_notification:old-item','1',?),('itemXnotification:local-only','keep',?)",
    ).run('2026-09-02T01:00:00.000Z', '2026-09-02T01:00:00.000Z');
    await repository.applyRemoteRecords([{
      user_id: 'user-a',
      table_name: 'accounts',
      local_id: 'seed-account-sleep',
      payload: { ...remoteAccount, name: '복구된 수면', updated_at: '2026-09-02T02:00:00.000Z' },
      client_updated_at: '2026-09-02T02:00:00.000Z',
      deleted_at: null,
      server_updated_at: '2026-09-02T02:00:01.000Z',
    }], { replaceSeedBootstrap: true });

    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toMatchObject({ count: 1 });
    expect(db.raw.prepare("SELECT name FROM accounts WHERE id='seed-account-sleep'").get()).toMatchObject({ name: '복구된 수면' });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM weekly_plans').get()).toMatchObject({ count: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get()).toMatchObject({ count: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM sync_conflicts').get()).toMatchObject({ count: 0 });
    expect(db.raw.prepare("SELECT value FROM settings WHERE key='item_notification:old-item'").get()).toBeUndefined();
    expect(db.raw.prepare("SELECT value FROM settings WHERE key='itemXnotification:local-only'").get()).toMatchObject({ value: 'keep' });
    db.raw.close();
  });

  it('preserves local work performed before the first login', async () => {
    const db = new TestSQLiteDatabase();
    await migrateDatabase(db.asExpoDatabase());
    const repository = new SyncRepository(db.asExpoDatabase());

    db.raw.prepare(
      "UPDATE accounts SET name='로그인 전 수정',updated_at='2026-09-02T03:00:00.000Z' WHERE id='seed-account-sleep'",
    ).run();

    expect(await repository.shouldReplaceSeedBootstrap(true)).toBe(false);
    db.raw.close();
  });
});
