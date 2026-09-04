import { dateKey, formatMinutes, remainingAvailableToday, todayItems } from '@/domain/calculations';
import type { AppSnapshot, Entry, Item, TodayItem } from '@/types/domain';

interface ItemAggregate {
  durationMinutes: number;
  count: number;
  latestValue: number | null;
  hasEntry: boolean;
}

interface TodayItemViewModel {
  candidate: TodayItem;
  runningEntry: Entry | null;
  latestManualEntry: Entry | null;
  summary: string;
}

interface RunningTimerViewModel {
  entry: Entry;
  item: Item;
}

interface TodayViewModel {
  activeItems: Item[];
  runningTimers: RunningTimerViewModel[];
  visibleItems: TodayItemViewModel[];
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

function summary(item: Item, aggregate: ItemAggregate | undefined): string {
  if (item.type === 'time') return formatMinutes(aggregate?.durationMinutes ?? 0);
  if (item.type === 'completion' || item.type === 'count') return `${aggregate?.count ?? 0}회`;
  if (!aggregate?.hasEntry) return '—';
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
  const todayEntries: Entry[] = [];
  const runningEntries: Entry[] = [];
  const runningByItem = new Map<string, Entry>();
  const latestManualByItem = new Map<string, Entry>();
  const aggregates = new Map<string, ItemAggregate>();
  let actualMinutes = 0;

  for (const entry of snapshot.entries) {
    if (entry.deletedAt) continue;
    if (entry.startedAt && !entry.endedAt) {
      runningEntries.push(entry);
      if (!runningByItem.has(entry.itemId)) runningByItem.set(entry.itemId, entry);
    }
    if (dateKey(new Date(entry.occurredAt)) !== today) continue;

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
    runningEntries.map((entry) => entry.itemId),
    today,
  );
  const visibleIds = new Set(candidates.map((candidate) => candidate.item.id));
  const visibleItems = candidates.map((candidate) => ({
    candidate,
    runningEntry: runningByItem.get(candidate.item.id) ?? null,
    latestManualEntry: latestManualByItem.get(candidate.item.id) ?? null,
    summary: summary(candidate.item, aggregates.get(candidate.item.id)),
  }));
  const plannedMinutes = candidates.reduce(
    (total, candidate) => total + (candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0),
    0,
  );

  return {
    activeItems,
    runningTimers: runningEntries.flatMap((entry) => {
      const item = activeItemById.get(entry.itemId);
      return item ? [{ entry, item }] : [];
    }),
    visibleItems,
    missingItems: activeItems.filter((item) => !visibleIds.has(item.id)),
    accountNames,
    plannedMinutes,
    actualMinutes,
    available: remainingAvailableToday(now, dayEndTime, candidates, todayEntries),
  };
}

export function searchMissingItems(items: readonly Item[], search: string): Item[] {
  const query = search.trim().toLocaleLowerCase('ko-KR');
  return items.filter((item) => item.name.toLocaleLowerCase('ko-KR').includes(query));
}
