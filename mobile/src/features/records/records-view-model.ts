import { dateKey, formatMinutes, todayItems } from '@/domain/calculations';
import type { AppSnapshot, Entry, Item } from '@/types/domain';

export interface LedgerEntryViewModel {
  entry: Entry;
  accountId: string;
  accountName: string;
  itemName: string;
  value: string;
  description: string;
}

export interface RecordsViewModel {
  plannedMinutes: number | null;
  actualMinutes: number;
  entries: LedgerEntryViewModel[];
  deletedEntries: LedgerEntryViewModel[];
  itemSummaries: AccountItemSummary[];
}

export interface AccountItemSummary {
  accountId: string;
  accountName: string;
  itemId: string;
  itemName: string;
  plannedMinutes: number | null;
  actualMinutes: number;
}

export function buildRecordsViewModel(
  snapshot: AppSnapshot,
  selectedDate: string,
  currentDate: string,
): RecordsViewModel {
  const itemById = new Map(snapshot.items.map((item) => [item.id, item]));
  const accountNames = new Map(snapshot.accounts.map((account) => [account.id, account.name]));
  const entriesForDate = snapshot.entries.filter((entry) => dateKey(new Date(entry.occurredAt)) === selectedDate);
  const entries = entriesForDate
    .filter((entry) => !entry.deletedAt)
    .map((entry) => entryViewModel(entry, itemById.get(entry.itemId), accountNames))
    .sort((left, right) => right.entry.occurredAt.localeCompare(left.entry.occurredAt));
  const deletedEntries = entriesForDate
    .filter((entry) => entry.deletedAt)
    .map((entry) => entryViewModel(entry, itemById.get(entry.itemId), accountNames))
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt));
  const actualMinutes = entries.reduce(
    (total, { entry }) => total + (entry.type === 'time' ? (entry.durationMin ?? 0) : 0),
    0,
  );
  const itemSummaries = buildItemSummaries(snapshot, entries, selectedDate, currentDate, accountNames, itemById);

  return {
    plannedMinutes: selectedDate === currentDate ? plannedMinutesForToday(snapshot, selectedDate) : null,
    actualMinutes,
    entries,
    deletedEntries,
    itemSummaries,
  };
}

function buildItemSummaries(
  snapshot: AppSnapshot,
  entries: readonly LedgerEntryViewModel[],
  selectedDate: string,
  currentDate: string,
  accountNames: ReadonlyMap<string, string>,
  itemById: ReadonlyMap<string, Item>,
): AccountItemSummary[] {
  const summaries = new Map<string, AccountItemSummary>();
  for (const row of entries) {
    if (row.entry.type !== 'time') continue;
    const current = summaries.get(row.entry.itemId) ?? {
      accountId: row.accountId,
      accountName: row.accountName,
      itemId: row.entry.itemId,
      itemName: row.itemName,
      plannedMinutes: null,
      actualMinutes: 0,
    };
    current.actualMinutes += row.entry.durationMin ?? 0;
    summaries.set(row.entry.itemId, current);
  }
  if (selectedDate === currentDate) {
    const runningItemIds = snapshot.entries.filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt).map((entry) => entry.itemId);
    for (const candidate of todayItems(snapshot.items, snapshot.schedules, snapshot.manualTodayItemIds, runningItemIds, selectedDate)) {
      if (candidate.item.type !== 'time') continue;
      const current = summaries.get(candidate.item.id) ?? {
        accountId: candidate.item.accountId,
        accountName: accountNames.get(candidate.item.accountId) ?? '삭제된 계정',
        itemId: candidate.item.id,
        itemName: itemById.get(candidate.item.id)?.name ?? candidate.item.name,
        plannedMinutes: null,
        actualMinutes: 0,
      };
      current.plannedMinutes = candidate.plannedValue ?? 0;
      summaries.set(candidate.item.id, current);
    }
  }
  return [...summaries.values()];
}

function entryViewModel(
  entry: Entry,
  item: Item | undefined,
  accountNames: ReadonlyMap<string, string>,
): LedgerEntryViewModel {
  const source = entry.startedAt ? '타이머' : entry.source === 'app' ? '직접 기록' : '기존 기록';
  const note = entry.note?.trim();
  return {
    entry,
    accountId: entry.accountId,
    accountName: accountNames.get(entry.accountId) ?? '삭제된 계정',
    itemName: item?.name ?? '삭제된 항목',
    value: entryValue(entry, item),
    description: note ? `${source} · ${note}` : source,
  };
}

function plannedMinutesForToday(snapshot: AppSnapshot, date: string): number {
  const runningItemIds = snapshot.entries
    .filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt)
    .map((entry) => entry.itemId);
  return todayItems(snapshot.items, snapshot.schedules, snapshot.manualTodayItemIds, runningItemIds, date)
    .reduce((total, candidate) => total + (candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0), 0);
}

function entryValue(entry: Entry, item: Item | undefined): string {
  if (entry.type === 'time') return entry.durationMin === null ? '진행 중' : formatMinutes(entry.durationMin);
  if (entry.type === 'completion' || entry.type === 'count') return `${entry.count ?? 0}회`;
  const unit = item?.unit ? ` ${item.unit}` : '';
  return `${entry.value ?? 0}${unit}`;
}
