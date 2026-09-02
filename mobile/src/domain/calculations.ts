import { APP_TIME_ZONE, WEEKLY_MINUTES } from '@/constants/app';
import type {
  Entry,
  Item,
  ItemSchedule,
  TodayItem,
  WeeklyPlan,
  WeeklyPlanLine,
} from '@/types/domain';

export interface PlanStatus {
  totalMinutes: number;
  deltaMinutes: number;
  kind: 'balanced' | 'over' | 'unallocated';
}

export interface RemainingTime {
  displayMinutes: number;
  rawMinutes: number;
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateFormatterCache.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  dateFormatterCache.set(timeZone, created);
  return created;
}

export function dateKey(date: Date, timeZone = APP_TIME_ZONE): string {
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(key: string, days: number): string {
  const value = new Date(`${key}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function weekdayIndex(key: string): number {
  const sundayBased = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return (sundayBased + 6) % 7;
}

export function weekRange(key: string, weekStartDay = 0): { start: string; end: string } {
  const current = weekdayIndex(key);
  const delta = (current - weekStartDay + 7) % 7;
  const start = addDays(key, -delta);
  return { start, end: addDays(start, 6) };
}

export function parseWeekStartDay(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0;
}

export function planStatus(minutes: readonly number[]): PlanStatus {
  const totalMinutes = minutes.reduce((sum, value) => sum + value, 0);
  const deltaMinutes = totalMinutes - WEEKLY_MINUTES;
  return {
    totalMinutes,
    deltaMinutes,
    kind: deltaMinutes === 0 ? 'balanced' : deltaMinutes > 0 ? 'over' : 'unallocated',
  };
}

export function latestPlanForWeek(
  plans: readonly WeeklyPlan[],
  lines: readonly WeeklyPlanLine[],
  weekStart: string,
): { plan: WeeklyPlan | null; lines: WeeklyPlanLine[] } {
  const plan = plans
    .filter((candidate) => candidate.weekStart === weekStart)
    .sort((left, right) => right.version - left.version)[0] ?? null;
  if (!plan) return { plan: null, lines: [] };
  return { plan, lines: lines.filter((line) => line.weeklyPlanId === plan.id) };
}

export function actualMinutesByAccount(entries: readonly Entry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    if (entry.deletedAt || entry.type !== 'time' || entry.durationMin === null) return totals;
    totals[entry.accountId] = (totals[entry.accountId] ?? 0) + entry.durationMin;
    return totals;
  }, {});
}

export function entryBelongsToRange(entry: Entry, start: string, end: string): boolean {
  const key = dateKey(new Date(entry.startedAt ?? entry.occurredAt));
  return key >= start && key <= end;
}

export function timerDurationMinutes(startedAt: string, endedAt: string): number {
  const difference = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(difference / 60_000));
}

export function scheduleMatchesDate(schedule: ItemSchedule, key: string): boolean {
  return schedule.autoCreate && (schedule.weekdayMask & (1 << weekdayIndex(key))) !== 0;
}

export function todayItems(
  items: readonly Item[],
  schedules: readonly ItemSchedule[],
  manualItemIds: readonly string[],
  runningItemIds: readonly string[],
  key: string,
): TodayItem[] {
  const activeItems = items.filter((item) => !item.deletedAt && !item.archived);
  const byId = new Map(activeItems.map((item) => [item.id, item]));
  const chosen = new Map<string, TodayItem>();

  for (const schedule of schedules) {
    if (schedule.deletedAt || !scheduleMatchesDate(schedule, key)) continue;
    const item = byId.get(schedule.itemId);
    if (item) chosen.set(item.id, { item, schedule, plannedValue: schedule.plannedValue });
  }

  for (const itemId of [...manualItemIds, ...runningItemIds]) {
    const item = byId.get(itemId);
    if (item && !chosen.has(itemId)) {
      chosen.set(itemId, { item, schedule: null, plannedValue: item.levelTarget });
    }
  }

  return [...chosen.values()].sort((left, right) => left.item.sortOrder - right.item.sortOrder);
}

function timeOfDayMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function remainingAvailableToday(
  now: Date,
  dayEndTime: string,
  scheduledItems: readonly TodayItem[],
  entries: readonly Entry[],
  timeZone = APP_TIME_ZONE,
): RemainingTime {
  const [endHour, endMinute] = dayEndTime.split(':').map(Number);
  const minutesUntilEnd = Math.max(0, endHour * 60 + endMinute - timeOfDayMinutes(now, timeZone));
  const today = dateKey(now, timeZone);
  const completedItemIds = new Set(
    entries
      .filter(
        (entry) =>
          !entry.deletedAt &&
          dateKey(new Date(entry.occurredAt), timeZone) === today &&
          (entry.type !== 'time' || entry.durationMin !== null),
      )
      .map((entry) => entry.itemId),
  );
  const outstanding = scheduledItems.reduce((sum, candidate) => {
    if (!candidate.schedule || completedItemIds.has(candidate.item.id)) return sum;
    return sum + (candidate.plannedValue ?? 0);
  }, 0);
  const rawMinutes = minutesUntilEnd - outstanding;
  return { rawMinutes, displayMinutes: Math.max(0, rawMinutes) };
}

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '−' : '';
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  if (hours === 0) return `${sign}${remainder}m`;
  if (remainder === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${remainder}m`;
}

export function aggregateKpi(values: readonly number[], aggregation: 'sum' | 'last' | 'max'): number {
  if (values.length === 0) return 0;
  if (aggregation === 'last') return values.at(-1) ?? 0;
  if (aggregation === 'max') return Math.max(...values);
  return values.reduce((sum, value) => sum + value, 0);
}
