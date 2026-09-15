import { dateKey, formatMinutes, remainingAvailableToday, todayItems } from '@/domain/calculations';
import {
  parseTimerRuntime,
  pauseTimerRuntime,
  timerRuntimeSettingKey,
  type TimerRuntime,
} from '@/domain/timer-runtime';
import type { AppSnapshot, Entry, Item, TodayItem } from '@/types/domain';

interface ItemAggregate {
  durationMinutes: number;
  count: number;
  latestValue: number | null;
  hasEntry: boolean;
}

export interface TimerSessionViewModel {
  entry: Entry;
  item: Item;
  runtime: TimerRuntime;
}

export interface TodayItemViewModel {
  candidate: TodayItem;
  session: TimerSessionViewModel | null;
  latestManualEntry: Entry | null;
  actualMinutes: number;
  summary: string;
  meta: string;
  trailing: string;
}

export interface TodayAccountGroupViewModel {
  accountId: string;
  accountName: string;
  plannedMinutes: number;
  actualMinutes: number;
  items: TodayItemViewModel[];
}

export interface TodayViewModel {
  activeItems: Item[];
  timerSessions: TimerSessionViewModel[];
  /** @deprecated Use timerSessions or runningTimer for status-aware behavior. */
  runningTimers: TimerSessionViewModel[];
  runningTimer: TimerSessionViewModel | null;
  currentTimer: TimerSessionViewModel | null;
  visibleItems: TodayItemViewModel[];
  accountGroups: TodayAccountGroupViewModel[];
  missingItems: Item[];
  accountNames: Readonly<Record<string, string>>;
  plannedMinutes: number;
  actualMinutes: number;
  available: { displayMinutes: number; rawMinutes: number };
}

export function amountLabel(item: Item): string {
  if (item.type === 'time') return '분';
  if (item.type === 'numeric' || item.type === 'event') return item.unit ?? '값';
  return '회';
}

function itemSummary(item: Item, plannedValue: number | null, aggregate: ItemAggregate | undefined): string {
  if (item.type === 'time') {
    const actual = aggregate?.durationMinutes ?? 0;
    if (plannedValue === null) return actual > 0 ? `계획 없음 · ${formatMinutes(actual)} 기록` : '계획 없음';
    const difference = plannedValue - actual;
    if (difference >= 0) return `${formatMinutes(actual)} 기록 · ${formatMinutes(difference)} 남음`;
    return `계획보다 ${formatMinutes(Math.abs(difference))} 더 기록`;
  }
  if (item.type === 'completion' || item.type === 'count') return `${aggregate?.count ?? 0}회`;
  if (!aggregate?.hasEntry) return '기록 없음';
  return `${aggregate.latestValue ?? 0}${item.unit ? ` ${item.unit}` : ''}`;
}

function itemMeta(item: Item, plannedValue: number | null, aggregate: ItemAggregate | undefined): string {
  if (item.type === 'time') {
    const plan = plannedValue === null ? '계획 없음' : `${formatMinutes(plannedValue)} 계획`;
    const actual = aggregate?.durationMinutes ?? 0;
    return actual > 0 ? `${plan} · ${formatMinutes(actual)} 기록` : plan;
  }
  if (item.type === 'completion') return `완료형 · 오늘 ${aggregate?.count ?? 0}회`;
  if (item.type === 'count') return `횟수형 · 오늘 ${aggregate?.count ?? 0}회`;
  if (!aggregate?.hasEntry) return `${item.type === 'event' ? '이벤트' : '수치형'} · 기록 없음`;
  return `${item.type === 'event' ? '이벤트' : '수치형'} · 오늘 ${aggregate.latestValue ?? 0}${item.unit ? ` ${item.unit}` : ''}`;
}

function itemTrailing(
  item: Item,
  plannedValue: number | null,
  aggregate: ItemAggregate | undefined,
  session: TimerSessionViewModel | null,
): string {
  if (session?.runtime.status === 'running') return '기록 중';
  if (session?.runtime.status === 'paused') return '일시정지';
  if (item.type === 'time') {
    const actual = aggregate?.durationMinutes ?? 0;
    if (plannedValue === null) return actual > 0 ? formatMinutes(actual) : '계획 없음';
    const remaining = plannedValue - actual;
    return remaining >= 0 ? `${formatMinutes(remaining)} 남음` : `+${formatMinutes(Math.abs(remaining))} 초과`;
  }
  if (item.type === 'completion' || item.type === 'count') {
    const actual = aggregate?.count ?? 0;
    if (plannedValue === null) return `${actual}회`;
    const remaining = plannedValue - actual;
    return remaining >= 0 ? `${remaining}회 남음` : `+${Math.abs(remaining)}회 초과`;
  }
  if (!aggregate?.hasEntry) return '기록 없음';
  return `${aggregate.latestValue ?? 0}${item.unit ? ` ${item.unit}` : ''}`;
}

export function buildTodayViewModel(
  snapshot: AppSnapshot,
  today: string,
  now: Date,
  dayEndTime: string,
): TodayViewModel {
  const activeItems = snapshot.items.filter((item) => !item.deletedAt && !item.archived);
  const activeItemById = new Map(activeItems.map((item) => [item.id, item]));
  const accountNames = Object.fromEntries(snapshot.accounts.map((account) => [account.id, account.name]));
  const nowIso = now.toISOString();
  let runningClaimed = false;
  const timerSessions = snapshot.entries.flatMap<TimerSessionViewModel>((entry) => {
    if (entry.deletedAt || !entry.startedAt || entry.endedAt) return [];
    const item = activeItemById.get(entry.itemId);
    if (!item) return [];
    let runtime = parseTimerRuntime(snapshot.settings[timerRuntimeSettingKey(entry.id)], entry.startedAt);
    if (runtime.status === 'running') {
      if (runningClaimed) runtime = pauseTimerRuntime(runtime, nowIso);
      else runningClaimed = true;
    }
    return [{ entry, item, runtime }];
  });
  const sessionByItem = new Map<string, TimerSessionViewModel>();
  for (const session of timerSessions) {
    if (!sessionByItem.has(session.item.id)) sessionByItem.set(session.item.id, session);
  }

  const todayEntries: Entry[] = [];
  const latestManualByItem = new Map<string, Entry>();
  const aggregates = new Map<string, ItemAggregate>();
  let actualMinutes = 0;

  for (const entry of snapshot.entries) {
    if (entry.deletedAt || dateKey(new Date(entry.occurredAt)) !== today) continue;
    todayEntries.push(entry);
    if (entry.type === 'time') actualMinutes += entry.durationMin ?? 0;
    if (!entry.startedAt && !latestManualByItem.has(entry.itemId)) latestManualByItem.set(entry.itemId, entry);

    const current = aggregates.get(entry.itemId) ?? {
      durationMinutes: 0,
      count: 0,
      latestValue: entry.value,
      hasEntry: false,
    };
    current.durationMinutes += entry.durationMin ?? 0;
    current.count += entry.count ?? 0;
    if (!current.hasEntry) current.latestValue = entry.value;
    current.hasEntry = true;
    aggregates.set(entry.itemId, current);
  }

  const candidates = todayItems(
    snapshot.items,
    snapshot.schedules,
    snapshot.manualTodayItemIds,
    timerSessions.map((session) => session.entry.itemId),
    today,
  );
  const visibleIds = new Set(candidates.map((candidate) => candidate.item.id));
  const visibleItems = candidates.map<TodayItemViewModel>((candidate) => {
    const aggregate = aggregates.get(candidate.item.id);
    const session = sessionByItem.get(candidate.item.id) ?? null;
    return {
      candidate,
      session,
      latestManualEntry: latestManualByItem.get(candidate.item.id) ?? null,
      actualMinutes: aggregate?.durationMinutes ?? 0,
      summary: itemSummary(candidate.item, candidate.plannedValue, aggregate),
      meta: itemMeta(candidate.item, candidate.plannedValue, aggregate),
      trailing: itemTrailing(candidate.item, candidate.plannedValue, aggregate, session),
    };
  });
  const plannedMinutes = candidates.reduce(
    (total, candidate) => total + (candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0),
    0,
  );
  const accountGroups = snapshot.accounts
    .filter((account) => !account.deletedAt && !account.archived)
    .flatMap<TodayAccountGroupViewModel>((account) => {
      const items = visibleItems.filter((visible) => visible.candidate.item.accountId === account.id);
      if (items.length === 0) return [];
      return [{
        accountId: account.id,
        accountName: account.name,
        plannedMinutes: items.reduce(
          (total, visible) => total + (
            visible.candidate.item.type === 'time' ? (visible.candidate.plannedValue ?? 0) : 0
          ),
          0,
        ),
        actualMinutes: items.reduce((total, visible) => total + visible.actualMinutes, 0),
        items,
      }];
    });

  return {
    activeItems,
    timerSessions,
    runningTimers: timerSessions,
    runningTimer: timerSessions.find((session) => session.runtime.status === 'running') ?? null,
    currentTimer: selectCurrentTimerSession(timerSessions),
    visibleItems,
    accountGroups,
    missingItems: activeItems.filter((item) => !visibleIds.has(item.id)),
    accountNames,
    plannedMinutes,
    actualMinutes,
    available: remainingAvailableToday(now, dayEndTime, candidates, todayEntries),
  };
}

export function selectCurrentTimerSession(
  sessions: readonly TimerSessionViewModel[],
): TimerSessionViewModel | null {
  const running = sessions.find((session) => session.runtime.status === 'running');
  if (running) return running;
  let latestPaused: TimerSessionViewModel | null = null;
  for (const session of sessions) {
    if (session.runtime.status !== 'paused') continue;
    if (
      latestPaused === null
      || latestPaused.runtime.status !== 'paused'
      || session.runtime.pausedAt > latestPaused.runtime.pausedAt
    ) latestPaused = session;
  }
  return latestPaused;
}

export function searchMissingItems(
  items: readonly Item[],
  search: string,
  accountNames: Readonly<Record<string, string>> = {},
): Item[] {
  const query = search.trim().toLocaleLowerCase('ko-KR');
  return items.filter((item) => (
    `${accountNames[item.accountId] ?? ''} ${item.name}`.toLocaleLowerCase('ko-KR').includes(query)
  ));
}
