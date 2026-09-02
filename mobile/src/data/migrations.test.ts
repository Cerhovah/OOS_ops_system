/// <reference types="node" />

import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import { accountSeeds, itemSeeds, kpiSeeds, migrateDatabase, projectSeeds, scheduleSeeds } from './migrations';
import { SyncRepository, type RemoteSyncRecord } from './sync-repository';

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));

class TestDatabase {
  readonly raw = new DatabaseSync(':memory:');

  async execAsync(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async getFirstAsync<T>(sql: string, ...params: SQLInputValue[]): Promise<T | null> {
    return (this.raw.prepare(sql).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: SQLInputValue[]): Promise<T[]> {
    return this.raw.prepare(sql).all(...params) as T[];
  }

  async runAsync(sql: string, ...params: SQLInputValue[]): Promise<void> {
    this.raw.prepare(sql).run(...params);
  }

  async withExclusiveTransactionAsync(task: (transaction: SQLiteDatabase) => Promise<void>): Promise<void> {
    this.raw.exec('BEGIN EXCLUSIVE');
    try {
      await task(this as unknown as SQLiteDatabase);
      this.raw.exec('COMMIT');
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }
}

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

  it('creates the additive v2 outbox schema and captures later mutations', async () => {
    const db = new TestDatabase();
    await migrateDatabase(db as unknown as SQLiteDatabase);

    expect(db.raw.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 2 });
    const initial = db.raw.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get() as { count: number };
    expect(initial.count).toBeGreaterThan(0);

    db.raw.prepare("UPDATE accounts SET name='수면 수정',updated_at='2026-09-02T01:00:00.000Z' WHERE id='seed-account-sleep'").run();
    const captured = db.raw.prepare(
      "SELECT payload_json,local_updated_at FROM sync_outbox WHERE table_name='accounts' AND record_id='seed-account-sleep'",
    ).get() as { payload_json: string; local_updated_at: string };
    expect(JSON.parse(captured.payload_json)).toMatchObject({ id: 'seed-account-sleep', name: '수면 수정' });
    expect(captured.local_updated_at).toBe('2026-09-02T01:00:00.000Z');
    db.raw.close();
  });

  it('applies a newer remote row, keeps a newer local row, and logs both conflicts', async () => {
    const db = new TestDatabase();
    await migrateDatabase(db as unknown as SQLiteDatabase);
    const repository = new SyncRepository(db as unknown as SQLiteDatabase);
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

  it('atomically replaces pristine install seeds when a remote backup exists', async () => {
    const db = new TestDatabase();
    await migrateDatabase(db as unknown as SQLiteDatabase);
    const repository = new SyncRepository(db as unknown as SQLiteDatabase);
    const remoteAccount = db.raw.prepare(
      "SELECT * FROM accounts WHERE id='seed-account-sleep'",
    ).get() as Record<string, string | number | null>;

    expect(await repository.shouldReplaceSeedBootstrap(true)).toBe(true);
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
    db.raw.close();
  });

  it('preserves local work performed before the first login', async () => {
    const db = new TestDatabase();
    await migrateDatabase(db as unknown as SQLiteDatabase);
    const repository = new SyncRepository(db as unknown as SQLiteDatabase);

    db.raw.prepare(
      "UPDATE accounts SET name='로그인 전 수정',updated_at='2026-09-02T03:00:00.000Z' WHERE id='seed-account-sleep'",
    ).run();

    expect(await repository.shouldReplaceSeedBootstrap(true)).toBe(false);
    db.raw.close();
  });
});
