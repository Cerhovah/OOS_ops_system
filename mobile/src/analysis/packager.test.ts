import { describe, expect, it } from 'vitest';

import type { AppSnapshot } from '@/types/domain';

import {
  buildAnalysisSnapshot,
  estimateSnapshotTokens,
  serializeAnalysisSnapshot,
  utf8ByteLength,
} from './packager';

const source: AppSnapshot = {
  accounts: [{
    id: 'account-a', name: '학업', color: null, kind: null, sortOrder: 0, archived: false,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null,
  }],
  projects: [{
    id: 'project-a', name: '시험', description: null, status: 'active', currentExperiment: null,
    nextDecisionDate: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null,
  }],
  items: [{
    id: 'item-a', accountId: 'account-a', projectId: 'project-a', name: '공부', type: 'time', unit: null,
    levelMin: null, levelTarget: 60, levelMax: null, defaultDurationMin: 60, countOnComplete: false,
    sortOrder: 0, archived: false, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null,
  }],
  schedules: [{
    id: 'schedule-a', itemId: 'item-a', weekdayMask: 5, plannedValue: 60, startTime: '09:00', autoCreate: true,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null,
  }],
  entries: [{
    id: 'entry-a', itemId: 'item-a', accountId: 'account-a', type: 'time', startedAt: null, endedAt: null,
    durationMin: 120, value: null, count: null, occurredAt: '2026-08-05T01:00:00.000Z', note: null,
    source: 'app', createdAt: '2026-08-05T01:00:00.000Z', updatedAt: '2026-08-05T01:00:00.000Z', deletedAt: null,
  }],
  plans: [{
    id: 'plan-a', weekStart: '2026-08-03', version: 1, note: null, source: 'app',
    createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z', deletedAt: null,
  }],
  planLines: [{
    id: 'line-a', weeklyPlanId: 'plan-a', accountId: 'account-a', plannedMinutes: 180,
    createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z', deletedAt: null,
  }],
  kpis: [{
    id: 'kpi-a', projectId: 'project-a', key: 'score', label: '점수', unit: '점', aggregation: 'last', sortOrder: 0,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null,
  }],
  kpiRecords: [{
    id: 'record-a', kpiId: 'kpi-a', value: 80, occurredAt: '2026-08-06T00:00:00.000Z', note: '모의', source: 'app',
    createdAt: '2026-08-06T00:00:00.000Z', updatedAt: '2026-08-06T00:00:00.000Z', deletedAt: null,
  }],
  closures: [], manualTodayItemIds: [], settings: {},
};

describe('Phase 4 data packager', () => {
  it('packages transparent daily, weekly, plan, item, project, KPI and note data', () => {
    const result = buildAnalysisSnapshot(
      source,
      [{ date: '2026-08-05', text: '하루 메모' }],
      [{ weekStart: '2026-08-03', text: '주간 코멘트' }],
      { rangeStart: '2026-08-03', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: true },
    );

    expect(result.weekly[0]).toMatchObject({ plannedMinutes: 180, actualMinutes: 120, differenceMinutes: -60 });
    expect(result.daily[0]).toMatchObject({ actualMinutes: 120 });
    expect(result.planVersions[0].lines[0]).toMatchObject({ accountId: 'account-a', plannedMinutes: 180 });
    expect(result.projects[0]).toMatchObject({ timeMinutes: 120 });
    expect(result.projects[0]).toMatchObject({ scheduledPlannedMinutes: 120, differenceMinutes: 0 });
    expect(result.projects[0].weeklyTime[0]).toEqual({ weekStart: '2026-08-03', actualMinutes: 120 });
    expect(result.itemActuals[0]).toMatchObject({
      scheduledPlannedMinutes: 120,
      expectedMinutesFromDefaults: 60,
      timeMinutes: 120,
      differenceFromScheduleMinutes: 0,
      differenceFromDefaultMinutes: 60,
    });
    expect(result.projects[0].kpis[0].records[0].value).toBe(80);
    expect(result.notes[0].text).toBe('하루 메모');
    expect(estimateSnapshotTokens(result)).toBeGreaterThan(0);
  });

  it('excludes archived accounts, archived items, and their plan or actual rows', () => {
    const archivedAccount = {
      ...source.accounts[0],
      id: 'account-archived',
      name: '보관 계정',
      archived: true,
    };
    const archivedItem = {
      ...source.items[0],
      id: 'item-archived',
      name: '보관 항목',
      archived: true,
    };
    const itemUnderArchivedAccount = {
      ...source.items[0],
      id: 'item-under-archived-account',
      accountId: archivedAccount.id,
      projectId: null,
      name: '보관 계정 항목',
    };
    const result = buildAnalysisSnapshot(
      {
        ...source,
        accounts: [...source.accounts, archivedAccount],
        items: [...source.items, archivedItem, itemUnderArchivedAccount],
        schedules: [
          ...source.schedules,
          { ...source.schedules[0], id: 'schedule-archived-item', itemId: archivedItem.id },
          { ...source.schedules[0], id: 'schedule-archived-account', itemId: itemUnderArchivedAccount.id },
        ],
        entries: [
          ...source.entries,
          { ...source.entries[0], id: 'entry-archived-item', itemId: archivedItem.id, durationMin: 30 },
          {
            ...source.entries[0],
            id: 'entry-archived-account',
            itemId: itemUnderArchivedAccount.id,
            accountId: archivedAccount.id,
            durationMin: 40,
          },
        ],
        planLines: [
          ...source.planLines,
          { ...source.planLines[0], id: 'line-archived-account', accountId: archivedAccount.id, plannedMinutes: 60 },
        ],
      },
      [],
      [],
      { rangeStart: '2026-08-03', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: false },
    );

    expect(result.accounts.map((account) => account.id)).toEqual(['account-a']);
    expect(result.items.map((item) => item.id)).toEqual(['item-a']);
    expect(result.itemActuals.map((item) => item.itemId)).toEqual(['item-a']);
    expect(result.planVersions[0].lines).toEqual([{ accountId: 'account-a', plannedMinutes: 180 }]);
    expect(result.weekly[0]).toMatchObject({ plannedMinutes: 180, actualMinutes: 120 });
    expect(result.daily[0].byAccount).toEqual([{ accountId: 'account-a', actualMinutes: 120 }]);
    expect(result.projects[0]).toMatchObject({ itemIds: ['item-a'], timeMinutes: 120 });
  });

  it('keeps the plan version for a partial week at the start of the selected period', () => {
    const result = buildAnalysisSnapshot(
      source,
      [],
      [],
      { rangeStart: '2026-08-05', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: false },
    );
    expect(result.planVersions.map((plan) => plan.id)).toContain('plan-a');
    expect(result.weekly[0].plannedMinutes).toBe(180);
  });

  it('drops older note detail and then daily rows when the token budget is exceeded', () => {
    const result = buildAnalysisSnapshot(
      source,
      Array.from({ length: 20 }, (_, index) => ({ date: '2026-08-05', text: `긴 메모 ${index} ${'x'.repeat(200)}` })),
      [],
      { rangeStart: '2026-08-03', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: true, tokenBudget: 100 },
    );
    expect(result.notes).toEqual([]);
    expect(result.aggregationLevel).toBe('weekly');
    expect(result.omissions).toContain('오래된 하루 메모 일부');
    expect(result.omissions).toContain('일 단위 집계를 주 단위로 상향');
  });

  it('excludes all note classes when notes are disabled and filters tombstoned plans', () => {
    const deletedPlan = { ...source.plans[0], id: 'deleted-plan', version: 2, deletedAt: '2026-09-01T00:00:00.000Z' };
    const result = buildAnalysisSnapshot(
      {
        ...source,
        plans: [...source.plans, deletedPlan],
        planLines: [...source.planLines, { ...source.planLines[0], id: 'deleted-line', weeklyPlanId: deletedPlan.id }],
      },
      [{ date: '2026-08-05', text: 'API_KEY=fake-secret-value-that-is-long' }],
      [{ weekStart: '2026-08-03', text: '주간 메모' }],
      { rangeStart: '2026-08-03', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: false },
    );

    expect(result.notes).toEqual([]);
    expect(result.weeklyComments).toEqual([]);
    expect(result.projects[0].kpis[0].records[0].note).toBeNull();
    expect(result.planVersions.map((plan) => plan.id)).toEqual(['plan-a']);
    expect(result.omissions).toContain('하루 메모, 주간 코멘트, KPI 기록 메모');
  });

  it('redacts likely secrets and enforces the serialized byte ceiling', () => {
    const result = buildAnalysisSnapshot(
      { ...source, accounts: [{ ...source.accounts[0], name: 'Authorization: Bearer fake-token-value' }] },
      [],
      [],
      { rangeStart: '2026-08-03', rangeEnd: '2026-08-09', generatedAt: '2026-09-04T00:00:00.000Z', weekStartDay: 0, includeNotes: true },
    );
    const serialized = serializeAnalysisSnapshot(result);
    expect(serialized).toContain('[REDACTED]');
    expect(utf8ByteLength('가a')).toBe(4);
    expect(() => serializeAnalysisSnapshot(result, 10)).toThrow('안전한 전송 한도');
  });
});
