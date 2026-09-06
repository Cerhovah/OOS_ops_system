import { describe, expect, it } from 'vitest';

import { buildRecordsViewModel } from './records-view-model';
import type { AppSnapshot } from '@/types/domain';

const snapshot: AppSnapshot = {
  accounts: [],
  projects: [],
  items: [{
    id: 'item-1', accountId: 'account-1', projectId: null, name: '공부', type: 'time', unit: null,
    levelMin: null, levelTarget: null, levelMax: null, defaultDurationMin: null, countOnComplete: false,
    sortOrder: 0, archived: false, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z', deletedAt: null,
  }],
  schedules: [{
    id: 'schedule-1', itemId: 'item-1', weekdayMask: 1 << 6, plannedValue: 50, startTime: null, autoCreate: true,
    createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z', deletedAt: null,
  }],
  entries: [{
    id: 'entry-1', itemId: 'item-1', accountId: 'account-1', type: 'time', startedAt: null, endedAt: null,
    durationMin: 30, value: null, count: null, occurredAt: '2026-09-06T02:00:00.000Z', note: '기존 메모', source: 'app',
    createdAt: '2026-09-06T02:00:00.000Z', updatedAt: '2026-09-06T02:00:00.000Z', deletedAt: null,
  }, {
    id: 'entry-2', itemId: 'item-1', accountId: 'account-1', type: 'time', startedAt: null, endedAt: null,
    durationMin: 10, value: null, count: null, occurredAt: '2026-09-05T02:00:00.000Z', note: null, source: 'import',
    createdAt: '2026-09-05T02:00:00.000Z', updatedAt: '2026-09-05T03:00:00.000Z', deletedAt: '2026-09-05T03:00:00.000Z',
  }],
  plans: [], planLines: [], kpis: [], kpiRecords: [], closures: [], manualTodayItemIds: [], settings: {},
};

describe('buildRecordsViewModel', () => {
  it('uses current schedule only for today and preserves past plans as unpreserved', () => {
    expect(buildRecordsViewModel(snapshot, '2026-09-06', '2026-09-06')).toMatchObject({ plannedMinutes: 50, actualMinutes: 30 });
    expect(buildRecordsViewModel(snapshot, '2026-09-05', '2026-09-06')).toMatchObject({ plannedMinutes: null, actualMinutes: 0 });
  });

  it('separates deleted ledger rows and labels imported data as existing records', () => {
    const model = buildRecordsViewModel(snapshot, '2026-09-05', '2026-09-06');
    expect(model.deletedEntries).toHaveLength(1);
    expect(model.deletedEntries[0]?.description).toBe('기존 기록');
  });
});
