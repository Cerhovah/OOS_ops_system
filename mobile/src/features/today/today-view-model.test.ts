import { describe, expect, it } from 'vitest';

import type { Account, AppSnapshot, Entry, Item, ItemSchedule } from '@/types/domain';

import { buildTodayViewModel, searchMissingItems } from './today-view-model';

const createdAt = '2026-09-01T00:00:00.000Z';
const account: Account = {
  id: 'account-1',
  name: '제품',
  color: null,
  kind: null,
  sortOrder: 0,
  archived: false,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
};

function item(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    accountId: account.id,
    projectId: null,
    name: id,
    type: 'time',
    unit: null,
    levelMin: null,
    levelTarget: null,
    levelMax: null,
    defaultDurationMin: null,
    countOnComplete: false,
    sortOrder: 0,
    archived: false,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  };
}

function entry(id: string, itemId: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    itemId,
    accountId: account.id,
    type: 'time',
    startedAt: null,
    endedAt: null,
    durationMin: 0,
    value: null,
    count: null,
    occurredAt: '2026-09-07T03:00:00.000Z',
    note: null,
    source: 'app',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  };
}

const schedule: ItemSchedule = {
  id: 'schedule-1',
  itemId: 'focus',
  weekdayMask: 1,
  plannedValue: 90,
  startTime: null,
  autoCreate: true,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
};

describe('buildTodayViewModel', () => {
  it('preserves visible totals while consistently excluding deleted and archived items from actions', () => {
    const snapshot: AppSnapshot = {
      accounts: [account],
      projects: [],
      items: [
        item('focus', { name: '집중 작업' }),
        item('weight', { name: '체중', type: 'numeric', unit: 'kg', sortOrder: 1 }),
        item('spare', { name: '다른 작업', sortOrder: 2 }),
        item('archived', { archived: true }),
        item('deleted', { deletedAt: createdAt }),
      ],
      schedules: [schedule],
      entries: [
        entry('weight-new', 'weight', { type: 'numeric', value: 71 }),
        entry('weight-old', 'weight', { type: 'numeric', value: 72, occurredAt: '2026-09-07T02:00:00.000Z' }),
        entry('focus-running', 'focus', { startedAt: '2026-09-07T04:00:00.000Z', durationMin: null }),
        entry('focus-manual', 'focus', { durationMin: 35 }),
        entry('archived-history', 'archived', { durationMin: 20 }),
        entry('deleted-running', 'deleted', { startedAt: '2026-09-07T05:00:00.000Z', durationMin: null }),
      ],
      plans: [],
      planLines: [],
      kpis: [],
      kpiRecords: [],
      closures: [],
      manualTodayItemIds: ['weight'],
      settings: {},
    };

    const result = buildTodayViewModel(snapshot, '2026-09-07', new Date('2026-09-07T01:00:00.000Z'), '23:00');

    expect(result.activeItems.map((candidate) => candidate.id)).toEqual(['focus', 'weight', 'spare']);
    expect(result.visibleItems.map((candidate) => candidate.candidate.item.id)).toEqual(['focus', 'weight']);
    expect(result.visibleItems.map((candidate) => candidate.summary)).toEqual(['35m', '71 kg']);
    expect(result.visibleItems[0]?.latestManualEntry?.id).toBe('focus-manual');
    expect(result.runningTimers.map((timer) => timer.entry.id)).toEqual(['focus-running']);
    expect(result.missingItems.map((candidate) => candidate.id)).toEqual(['spare']);
    expect(result.plannedMinutes).toBe(90);
    expect(result.actualMinutes).toBe(55);
    expect(searchMissingItems(result.missingItems, '다른')).toHaveLength(1);
  });
});
