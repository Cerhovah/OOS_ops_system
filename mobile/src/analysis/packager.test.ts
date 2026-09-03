import { describe, expect, it } from 'vitest';

import type { AppSnapshot } from '@/types/domain';

import { buildAnalysisSnapshot, estimateSnapshotTokens } from './packager';

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
  plans: [{ id: 'plan-a', weekStart: '2026-08-03', version: 1, note: null, source: 'app', createdAt: '2026-08-02T00:00:00.000Z' }],
  planLines: [{ id: 'line-a', weeklyPlanId: 'plan-a', accountId: 'account-a', plannedMinutes: 180 }],
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
});
