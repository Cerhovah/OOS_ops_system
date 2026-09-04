import { addDays, dateKey, scheduleMatchesDate, weekRange } from '@/domain/calculations';
import type { AppSnapshot, Entry, Item, WeeklyPlan, WeeklyPlanLine } from '@/types/domain';

import type { AnalysisDataSnapshot } from './snapshot-types';

interface ItemTotals {
  timeMinutes: number;
  count: number;
  valueTotal: number;
  lastValue: number | null;
  lastAt: string;
  recordCount: number;
}

export interface EntryAggregates {
  dailyTotals: Map<string, number>;
  dailyAccounts: Map<string, Map<string, number>>;
  weeklyTotals: Map<string, number>;
  weeklyAccounts: Map<string, Map<string, number>>;
  itemTotals: Map<string, ItemTotals>;
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function entryDate(entry: Entry): string {
  return dateKey(new Date(entry.occurredAt));
}

export function latestPlansByWeek(plans: readonly WeeklyPlan[]): Map<string, WeeklyPlan> {
  const latest = new Map<string, WeeklyPlan>();
  for (const plan of plans) {
    const current = latest.get(plan.weekStart);
    if (!current || plan.version > current.version) latest.set(plan.weekStart, plan);
  }
  return latest;
}

export function addToMap(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

export function dateKeysInRange(start: string, end: string): string[] {
  const keys: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) keys.push(current);
  return keys;
}

export function scheduledMinutes(
  item: Item,
  schedules: AppSnapshot['schedules'],
  dates: readonly string[],
): number {
  if (item.type !== 'time') return 0;
  return schedules
    .filter((schedule) => schedule.itemId === item.id && !schedule.deletedAt && schedule.autoCreate)
    .reduce((total, schedule) => total + dates.reduce(
      (sum, day) => sum + (scheduleMatchesDate(schedule, day)
        ? (schedule.plannedValue ?? item.defaultDurationMin ?? 0)
        : 0),
      0,
    ), 0);
}

export function aggregateEntries(
  entries: readonly Entry[],
  weekStartDay: number,
): EntryAggregates {
  const aggregates: EntryAggregates = {
    dailyTotals: new Map(),
    dailyAccounts: new Map(),
    weeklyTotals: new Map(),
    weeklyAccounts: new Map(),
    itemTotals: new Map(),
  };

  for (const entry of entries) {
    const day = entryDate(entry);
    const weekStart = weekRange(day, weekStartDay).start;
    const minutes = entry.type === 'time' ? Math.max(0, entry.durationMin ?? 0) : 0;
    addToMap(aggregates.dailyTotals, day, minutes);
    addToMap(aggregates.weeklyTotals, weekStart, minutes);

    const dayAccounts = aggregates.dailyAccounts.get(day) ?? new Map<string, number>();
    addToMap(dayAccounts, entry.accountId, minutes);
    aggregates.dailyAccounts.set(day, dayAccounts);

    const weekAccounts = aggregates.weeklyAccounts.get(weekStart) ?? new Map<string, number>();
    addToMap(weekAccounts, entry.accountId, minutes);
    aggregates.weeklyAccounts.set(weekStart, weekAccounts);

    const current = aggregates.itemTotals.get(entry.itemId) ?? {
      timeMinutes: 0,
      count: 0,
      valueTotal: 0,
      lastValue: null,
      lastAt: '',
      recordCount: 0,
    };
    current.timeMinutes += minutes;
    current.count += entry.count ?? 0;
    current.valueTotal += entry.value ?? 0;
    current.recordCount += 1;
    if (entry.value !== null && entry.occurredAt >= current.lastAt) {
      current.lastValue = entry.value;
      current.lastAt = entry.occurredAt;
    }
    aggregates.itemTotals.set(entry.itemId, current);
  }

  return aggregates;
}

export function buildWeeklyRows(
  latestPlans: ReadonlyMap<string, WeeklyPlan>,
  planLines: readonly WeeklyPlanLine[],
  aggregates: Pick<EntryAggregates, 'weeklyTotals' | 'weeklyAccounts'>,
): AnalysisDataSnapshot['weekly'] {
  const weekKeys = new Set<string>([...latestPlans.keys(), ...aggregates.weeklyTotals.keys()]);
  return [...weekKeys].sort().map((weekStart) => {
    const plan = latestPlans.get(weekStart);
    const plannedByAccount = new Map<string, number>();
    if (plan) {
      for (const line of planLines.filter(
        (candidate) => candidate.weeklyPlanId === plan.id && !candidate.deletedAt,
      )) {
        addToMap(plannedByAccount, line.accountId, line.plannedMinutes);
      }
    }
    const actualByAccount = aggregates.weeklyAccounts.get(weekStart) ?? new Map<string, number>();
    const accountIds = new Set<string>([...plannedByAccount.keys(), ...actualByAccount.keys()]);
    const byAccount = [...accountIds].map((accountId) => {
      const plannedMinutes = plannedByAccount.get(accountId) ?? 0;
      const actualMinutes = actualByAccount.get(accountId) ?? 0;
      return { accountId, plannedMinutes, actualMinutes, differenceMinutes: actualMinutes - plannedMinutes };
    });
    const plannedMinutes = byAccount.reduce((sum, line) => sum + line.plannedMinutes, 0);
    const actualMinutes = byAccount.reduce((sum, line) => sum + line.actualMinutes, 0);
    return {
      weekStart,
      plannedMinutes,
      actualMinutes,
      differenceMinutes: actualMinutes - plannedMinutes,
      byAccount,
    };
  });
}
