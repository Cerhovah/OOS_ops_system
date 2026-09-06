import { dateKey, formatMinutes, todayItems } from '@/domain/calculations';
import type { AppSnapshot, Entry, Item } from '@/types/domain';

export interface LedgerEntryViewModel {
  entry: Entry;
  itemName: string;
  value: string;
  description: string;
}

export interface RecordsViewModel {
  plannedMinutes: number | null;
  actualMinutes: number;
  entries: LedgerEntryViewModel[];
  deletedEntries: LedgerEntryViewModel[];
}

export function buildRecordsViewModel(
  snapshot: AppSnapshot,
  selectedDate: string,
  currentDate: string,
): RecordsViewModel {
  const itemById = new Map(snapshot.items.map((item) => [item.id, item]));
  const entriesForDate = snapshot.entries.filter((entry) => dateKey(new Date(entry.occurredAt)) === selectedDate);
  const entries = entriesForDate
    .filter((entry) => !entry.deletedAt)
    .map((entry) => entryViewModel(entry, itemById.get(entry.itemId)))
    .sort((left, right) => right.entry.occurredAt.localeCompare(left.entry.occurredAt));
  const deletedEntries = entriesForDate
    .filter((entry) => entry.deletedAt)
    .map((entry) => entryViewModel(entry, itemById.get(entry.itemId)))
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt));
  const actualMinutes = entries.reduce(
    (total, { entry }) => total + (entry.type === 'time' ? (entry.durationMin ?? 0) : 0),
    0,
  );

  return {
    plannedMinutes: selectedDate === currentDate ? plannedMinutesForToday(snapshot, selectedDate) : null,
    actualMinutes,
    entries,
    deletedEntries,
  };
}

function plannedMinutesForToday(snapshot: AppSnapshot, date: string): number {
  const runningItemIds = snapshot.entries
    .filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt)
    .map((entry) => entry.itemId);
  return todayItems(snapshot.items, snapshot.schedules, snapshot.manualTodayItemIds, runningItemIds, date)
    .reduce((total, candidate) => total + (candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0), 0);
}

function entryViewModel(entry: Entry, item: Item | undefined): LedgerEntryViewModel {
  const itemName = item?.name ?? '기존 항목';
  const value = entryValue(entry, item);
  const source = entry.startedAt ? '타이머' : entry.source === 'app' ? '직접 기록' : '기존 기록';
  const note = entry.note?.trim();
  return {
    entry,
    itemName,
    value,
    description: note ? `${source} · ${note}` : source,
  };
}

function entryValue(entry: Entry, item: Item | undefined): string {
  if (entry.type === 'time') return entry.durationMin === null ? '진행 중' : formatMinutes(entry.durationMin);
  if (entry.type === 'completion' || entry.type === 'count') return `${entry.count ?? 0}회`;
  const unit = item?.unit ? ` ${item.unit}` : '';
  return `${entry.value ?? 0}${unit}`;
}
