import { describe, expect, it } from 'vitest';

import {
  actualMinutesByAccount,
  addDays,
  aggregateKpi,
  dateKey,
  entryBelongsToRange,
  formatMinutes,
  latestPlanForWeek,
  planStatus,
  remainingAvailableToday,
  scheduleMatchesDate,
  timerDurationMinutes,
  todayItems,
  weekdayIndex,
  weekRange,
} from './calculations';
import type { Entry, Item, ItemSchedule, WeeklyPlan, WeeklyPlanLine } from '@/types/domain';

const stamp = '2026-08-20T00:00:00.000Z';

function item(id: string, sortOrder = 0): Item {
  return {
    id,
    accountId: 'account',
    projectId: null,
    name: id,
    type: 'time',
    unit: null,
    levelMin: null,
    levelTarget: 60,
    levelMax: null,
    defaultDurationMin: 30,
    countOnComplete: false,
    sortOrder,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
  };
}

function schedule(itemId: string, weekdayMask: number, plannedValue = 60): ItemSchedule {
  return {
    id: `schedule-${itemId}`,
    itemId,
    weekdayMask,
    plannedValue,
    startTime: null,
    autoCreate: true,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
  };
}

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'entry',
    itemId: 'item',
    accountId: 'account',
    type: 'time',
    startedAt: null,
    endedAt: null,
    durationMin: 60,
    value: null,
    count: null,
    occurredAt: '2026-08-20T10:00:00+09:00',
    note: null,
    source: 'app',
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
    ...overrides,
  };
}

describe('date and week calculations', () => {
  it('uses the Asia/Seoul calendar date', () => {
    expect(dateKey(new Date('2026-08-19T15:30:00.000Z'))).toBe('2026-08-20');
  });

  it('adds days and maps Monday to index zero', () => {
    expect(addDays('2026-08-20', 4)).toBe('2026-08-24');
    expect(weekdayIndex('2026-08-24')).toBe(0);
  });

  it('returns a Monday-through-Sunday range across month boundaries', () => {
    expect(weekRange('2026-09-01')).toEqual({ start: '2026-08-31', end: '2026-09-06' });
  });
});

describe('plan and actual calculations', () => {
  it('classifies balanced, over, and unallocated plans', () => {
    expect(planStatus([10_080]).kind).toBe('balanced');
    expect(planStatus([10_081])).toMatchObject({ kind: 'over', deltaMinutes: 1 });
    expect(planStatus([10_000])).toMatchObject({ kind: 'unallocated', deltaMinutes: -80 });
  });

  it('selects the latest append-only plan version and its lines', () => {
    const plans: WeeklyPlan[] = [
      { id: 'v1', weekStart: '2026-08-17', version: 1, note: null, source: 'app', createdAt: stamp },
      { id: 'v2', weekStart: '2026-08-17', version: 2, note: null, source: 'app', createdAt: stamp },
    ];
    const lines: WeeklyPlanLine[] = [
      { id: 'l1', weeklyPlanId: 'v1', accountId: 'a', plannedMinutes: 60 },
      { id: 'l2', weeklyPlanId: 'v2', accountId: 'a', plannedMinutes: 90 },
    ];
    expect(latestPlanForWeek(plans, lines, '2026-08-17')).toEqual({ plan: plans[1], lines: [lines[1]] });
    expect(latestPlanForWeek(plans, lines, '2026-08-24')).toEqual({ plan: null, lines: [] });
  });

  it('sums only active completed time entries by account', () => {
    expect(
      actualMinutesByAccount([
        entry({ id: 'a', durationMin: 30 }),
        entry({ id: 'b', durationMin: 45 }),
        entry({ id: 'c', type: 'count', durationMin: null, count: 1 }),
        entry({ id: 'd', durationMin: 10, deletedAt: stamp }),
      ]),
    ).toEqual({ account: 75 });
  });
});

describe('today and timer calculations', () => {
  it('matches weekday masks', () => {
    expect(scheduleMatchesDate(schedule('commute', 1 << 3), '2026-08-20')).toBe(true);
    expect(scheduleMatchesDate(schedule('commute', 1 << 0), '2026-08-20')).toBe(false);
  });

  it('deduplicates scheduled, manual, and running items', () => {
    const items = [item('scheduled', 2), item('manual', 1)];
    const result = todayItems(items, [schedule('scheduled', 1 << 3)], ['scheduled', 'manual'], ['manual'], '2026-08-20');
    expect(result.map((candidate) => candidate.item.id)).toEqual(['manual', 'scheduled']);
  });

  it('excludes archived and deleted items', () => {
    const archived = { ...item('archived'), archived: true };
    const deleted = { ...item('deleted'), deletedAt: stamp };
    expect(todayItems([archived, deleted], [], ['archived', 'deleted'], [], '2026-08-20')).toEqual([]);
  });

  it('subtracts unfinished fixed schedules and preserves negative raw time', () => {
    const now = new Date('2026-08-20T12:00:00.000Z'); // 21:00 in Seoul
    const scheduled = todayItems([item('fixed')], [schedule('fixed', 1 << 3, 180)], [], [], '2026-08-20');
    expect(remainingAvailableToday(now, '23:00', scheduled, [])).toEqual({ rawMinutes: -60, displayMinutes: 0 });
  });

  it('does not subtract a schedule after any active entry for that item', () => {
    const now = new Date('2026-08-20T11:00:00.000Z'); // 20:00 in Seoul
    const scheduled = todayItems([item('fixed')], [schedule('fixed', 1 << 3, 90)], [], [], '2026-08-20');
    expect(remainingAvailableToday(now, '23:00', scheduled, [entry({ itemId: 'fixed' })])).toEqual({
      rawMinutes: 180,
      displayMinutes: 180,
    });
  });

  it('keeps a schedule outstanding while its timer is still running', () => {
    const now = new Date('2026-08-20T11:00:00.000Z');
    const scheduled = todayItems([item('fixed')], [schedule('fixed', 1 << 3, 90)], [], [], '2026-08-20');
    const running = entry({ itemId: 'fixed', startedAt: '2026-08-20T19:30:00+09:00', durationMin: null });
    expect(remainingAvailableToday(now, '23:00', scheduled, [running])).toEqual({
      rawMinutes: 90,
      displayMinutes: 90,
    });
  });

  it('assigns a timer crossing midnight to its start date and computes duration', () => {
    const crossing = entry({
      startedAt: '2026-08-23T23:50:00+09:00',
      endedAt: '2026-08-24T00:20:00+09:00',
      occurredAt: '2026-08-23T23:50:00+09:00',
    });
    expect(timerDurationMinutes(crossing.startedAt!, crossing.endedAt!)).toBe(30);
    expect(entryBelongsToRange(crossing, '2026-08-17', '2026-08-23')).toBe(true);
    expect(entryBelongsToRange(crossing, '2026-08-24', '2026-08-30')).toBe(false);
  });
});

describe('formatting and KPI aggregation', () => {
  it('formats signed minute values without judgment', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(100)).toBe('1h 40m');
    expect(formatMinutes(-100)).toBe('−1h 40m');
  });

  it('supports all KPI aggregation modes', () => {
    expect(aggregateKpi([], 'sum')).toBe(0);
    expect(aggregateKpi([1, 2, 3], 'sum')).toBe(6);
    expect(aggregateKpi([1, 2, 3], 'last')).toBe(3);
    expect(aggregateKpi([1, 4, 3], 'max')).toBe(4);
  });
});
