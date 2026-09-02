import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addDays, dateKey, weekRange } from '@/domain/calculations';
import type { ItemInput } from '@/types/domain';

import { migrateDatabase } from './migrations';
import { AppRepository } from './repository';

vi.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

class TestSQLiteDatabase {
  private readonly database = new DatabaseSync(':memory:');

  asExpoDatabase(): SQLiteDatabase {
    return this as unknown as SQLiteDatabase;
  }

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, ...params: SQLInputValue[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = this.database.prepare(source).run(...params);
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }

  async getFirstAsync<T>(source: string, ...params: SQLInputValue[]): Promise<T | null> {
    return (this.database.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: SQLInputValue[]): Promise<T[]> {
    return this.database.prepare(source).all(...params) as T[];
  }

  async withExclusiveTransactionAsync(task: (database: SQLiteDatabase) => Promise<void>): Promise<void> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      await task(this.asExpoDatabase());
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

describe('AppRepository with real SQLite', () => {
  let adapter: TestSQLiteDatabase;
  let database: SQLiteDatabase;
  let repository: AppRepository;

  beforeEach(async () => {
    adapter = new TestSQLiteDatabase();
    database = adapter.asExpoDatabase();
    await migrateDatabase(database);
    repository = new AppRepository(database);
  });

  afterEach(() => adapter.close());

  it('migrates and seeds idempotently with the exact Phase 1 baseline', async () => {
    const today = dateKey(new Date());
    const initial = await repository.loadSnapshot(today);
    const latestPlan = initial.plans[0];

    expect(initial.accounts).toHaveLength(14);
    expect(initial.items).toHaveLength(8);
    expect(initial.projects).toHaveLength(2);
    expect(initial.kpis).toHaveLength(8);
    expect(initial.planLines.filter((line) => line.weeklyPlanId === latestPlan.id))
      .toHaveLength(14);
    expect(initial.planLines
      .filter((line) => line.weeklyPlanId === latestPlan.id)
      .reduce((sum, line) => sum + line.plannedMinutes, 0))
      .toBe(168 * 60);
    expect(initial.settings).toMatchObject({
      time_zone: 'Asia/Seoul',
      day_end_time: '23:00',
      close_notification_time: '21:30',
    });

    await migrateDatabase(database);
    const migratedAgain = await repository.loadSnapshot(today);
    expect(migratedAgain.accounts).toHaveLength(14);
    expect(migratedAgain.items).toHaveLength(8);
    expect(migratedAgain.projects).toHaveLength(2);
    expect(migratedAgain.plans).toHaveLength(1);
  });

  it('persists account and item edit, archive, soft-delete, and restore lifecycles', async () => {
    const today = dateKey(new Date());
    const initial = await repository.loadSnapshot(today);
    const sleep = initial.accounts.find((account) => account.id === 'seed-account-sleep')!;

    await repository.saveAccount({ id: sleep.id, name: '수면 테스트', kind: sleep.kind, color: sleep.color });
    await repository.setAccountArchived(sleep.id, true);
    let snapshot = await repository.loadSnapshot(today);
    expect(snapshot.accounts.find((account) => account.id === sleep.id)).toMatchObject({
      name: '수면 테스트',
      archived: true,
      deletedAt: null,
    });

    await repository.setAccountArchived(sleep.id, false);
    await repository.deleteAccount(sleep.id);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.accounts.find((account) => account.id === sleep.id)?.deletedAt).not.toBeNull();
    await repository.restoreAccount(sleep.id);

    const countInput: ItemInput = {
      name: '자동 검증 횟수',
      accountId: 'seed-account-exercise',
      projectId: null,
      type: 'count',
      unit: '회',
      levelMin: null,
      levelTarget: 4,
      levelMax: null,
      defaultDurationMin: null,
      countOnComplete: false,
      weekdayMask: 0,
      plannedValue: null,
      startTime: null,
      autoCreate: false,
    };
    const itemId = await repository.saveItem(countInput);
    await repository.saveItem({ ...countInput, id: itemId, name: '자동 검증 횟수 수정' });
    await repository.setItemArchived(itemId, true);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.items.find((item) => item.id === itemId)).toMatchObject({
      name: '자동 검증 횟수 수정',
      archived: true,
    });
    await repository.setItemArchived(itemId, false);
    await repository.deleteItem(itemId);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.items.find((item) => item.id === itemId)?.deletedAt).not.toBeNull();
    await repository.restoreItem(itemId);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.items.find((item) => item.id === itemId)).toMatchObject({ deletedAt: null });

    const commuteSchedule = snapshot.schedules.find((schedule) => schedule.itemId === 'seed-item-commute')!;
    await repository.deleteItem('seed-item-commute');
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.schedules.find((schedule) => schedule.id === commuteSchedule.id)?.deletedAt).not.toBeNull();
    await repository.restoreItem('seed-item-commute');
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.schedules.find((schedule) => schedule.id === commuteSchedule.id)).toMatchObject({
      weekdayMask: commuteSchedule.weekdayMask,
      plannedValue: commuteSchedule.plannedValue,
      deletedAt: null,
    });
    expect(snapshot.accounts.find((account) => account.id === sleep.id)).toMatchObject({
      name: '수면 테스트',
      archived: false,
      deletedAt: null,
    });
  });

  it('records, updates, soft-deletes, and restores all five item types', async () => {
    const today = dateKey(new Date());
    const initial = await repository.loadSnapshot(today);
    const definitions: { name: string; type: ItemInput['type']; unit: string | null; amount: number }[] = [
      { name: '자동 시간', type: 'time', unit: null, amount: 30 },
      { name: '자동 완료', type: 'completion', unit: null, amount: 1 },
      { name: '자동 횟수', type: 'count', unit: '회', amount: 2 },
      { name: '자동 수치', type: 'numeric', unit: 'kg', amount: 70.5 },
      { name: '자동 이벤트', type: 'event', unit: 'KRW', amount: 1000 },
    ];
    const itemIds: string[] = [];
    for (const definition of definitions) {
      itemIds.push(await repository.saveItem({
        name: definition.name,
        accountId: 'seed-account-exercise',
        projectId: null,
        type: definition.type,
        unit: definition.unit,
        levelMin: definition.type === 'time' ? 10 : null,
        levelTarget: definition.type === 'time' ? 30 : null,
        levelMax: definition.type === 'time' ? 60 : null,
        defaultDurationMin: definition.type === 'time' ? 30 : null,
        countOnComplete: definition.type === 'time',
        weekdayMask: 0,
        plannedValue: null,
        startTime: null,
        autoCreate: false,
      }));
    }
    const withTypes = await repository.loadSnapshot(today);
    const targets = itemIds.map((itemId, index) => [
      withTypes.items.find((item) => item.id === itemId)!,
      definitions[index].amount,
    ] as const);

    for (const [item, amount] of targets) await repository.createEntry(item, amount, '자동 검증');
    await repository.createEntry(withTypes.items.find((item) => item.id === itemIds[4])!, null, '값 없는 이벤트');
    let snapshot = await repository.loadSnapshot(today);
    expect(new Set(snapshot.entries.map((entry) => entry.type)))
      .toEqual(new Set(['time', 'completion', 'count', 'numeric', 'event']));

    const countEntry = snapshot.entries.find((entry) => entry.itemId === itemIds[2])!;
    await repository.updateEntry(countEntry.id, 3, '수정됨');
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.entries.find((entry) => entry.id === countEntry.id)).toMatchObject({ count: 3, note: '수정됨' });
    await repository.deleteEntry(countEntry.id);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.entries.find((entry) => entry.id === countEntry.id)?.deletedAt).not.toBeNull();
    await repository.restoreEntry(countEntry.id);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.entries.find((entry) => entry.id === countEntry.id)?.deletedAt).toBeNull();
    const optionalEvent = snapshot.entries.find((entry) => entry.note === '값 없는 이벤트')!;
    expect(optionalEvent.value).toBeNull();
    await repository.updateEntry(optionalEvent.id, null, '메모만 수정');
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.entries.find((entry) => entry.id === optionalEvent.id)).toMatchObject({ value: null, note: '메모만 수정' });
    expect(initial.entries).toHaveLength(0);
  });

  it('keeps weekly plans append-only and copies the latest previous plan', async () => {
    const currentWeek = weekRange(dateKey(new Date())).start;
    const nextWeek = addDays(currentWeek, 7);
    const initial = await repository.loadSnapshot(dateKey(new Date()));
    const values = Object.fromEntries(initial.accounts.map((account, index) => [account.id, index === 0 ? 3000 : 0]));

    expect(await repository.saveWeeklyPlan(currentWeek, values)).toBe(2);
    values['seed-account-sleep'] = 2940;
    expect(await repository.saveWeeklyPlan(currentWeek, values, 'app', '수정 버전')).toBe(3);
    expect(await repository.copyPreviousWeek(nextWeek)).toBe(true);

    const snapshot = await repository.loadSnapshot(dateKey(new Date()));
    const currentVersions = snapshot.plans.filter((plan) => plan.weekStart === currentWeek);
    const copied = snapshot.plans.find((plan) => plan.weekStart === nextWeek);
    expect(currentVersions.map((plan) => plan.version).sort()).toEqual([1, 2, 3]);
    expect(copied).toMatchObject({ version: 1, source: 'copy_last_week' });
    expect(snapshot.planLines.filter((line) => line.weeklyPlanId === copied?.id)).toHaveLength(14);
  });

  it('persists project/KPI, close-day, settings, comments, manual today items, and complete exports', async () => {
    const today = dateKey(new Date());
    const projectId = await repository.saveProject({
      name: '자동 검증 프로젝트',
      description: null,
      status: 'active',
      currentExperiment: '통합 테스트',
      nextDecisionDate: null,
    });
    await repository.createKpi(projectId, '자동 KPI', '회', 'sum');
    let snapshot = await repository.loadSnapshot(today);
    const kpi = snapshot.kpis.find((candidate) => candidate.projectId === projectId)!;
    await repository.recordKpi(kpi.id, 2, '자동 검증');
    await repository.addTodayItem(today, 'seed-item-study');
    await repository.addTodayItem(today, 'seed-item-study');
    await repository.saveWeeklyComment(weekRange(today).start, '주간 코멘트');
    await repository.closeDay(today, 60, 30, JSON.stringify({ rows: [] }), '종료 메모');
    await repository.setSetting('test_setting', 'stored');
    await repository.saveWeeklyPlan(weekRange(today).start, { 'seed-account-sleep': 49 * 60 }, 'app', '내보내기 버전');
    await repository.deleteKpi(kpi.id);
    await repository.deleteProject(projectId);

    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.manualTodayItemIds).toEqual(['seed-item-study']);
    expect(snapshot.closures.find((closure) => closure.date === today)).toMatchObject({ note: '종료 메모' });
    expect(await repository.getWeeklyComment(weekRange(today).start)).toBe('주간 코멘트');
    expect(await repository.getSetting('test_setting')).toBe('stored');
    expect(snapshot.kpis.find((candidate) => candidate.id === kpi.id)?.deletedAt).not.toBeNull();
    expect(snapshot.projects.find((candidate) => candidate.id === projectId)?.deletedAt).not.toBeNull();

    const exported = await repository.exportTables();
    expect(Object.keys(exported)).toHaveLength(17);
    expect(exported).toHaveProperty('sync_outbox');
    expect(exported).toHaveProperty('sync_conflicts');
    expect(exported).toHaveProperty('sync_state');
    expect(exported.project_kpis.find((row) => row.id === kpi.id)?.deleted_at).not.toBeNull();
    expect(exported.projects.find((row) => row.id === projectId)?.deleted_at).not.toBeNull();
    expect(exported.weekly_plans.map((row) => row.version)).toEqual(expect.arrayContaining([1, 2]));

    await repository.restoreKpi(kpi.id);
    await repository.restoreProject(projectId);
    snapshot = await repository.loadSnapshot(today);
    expect(snapshot.kpis.find((candidate) => candidate.id === kpi.id)?.deletedAt).toBeNull();
    expect(snapshot.projects.find((candidate) => candidate.id === projectId)?.deletedAt).toBeNull();
  });
});
