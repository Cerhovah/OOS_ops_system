import type { Account, WeeklyPlanLine } from '@/types/domain';

export interface PlanDraft {
  weekStart: string;
  sourceKey: string;
  hours: Readonly<Record<string, string>>;
  dirty: boolean;
}

export function planDraftHours(
  accounts: readonly Account[],
  lines: readonly WeeklyPlanLine[],
): Readonly<Record<string, string>> {
  const minutesByAccount = new Map(
    lines.filter((line) => !line.deletedAt).map((line) => [line.accountId, line.plannedMinutes]),
  );
  return Object.fromEntries(
    accounts.map((account) => [account.id, String((minutesByAccount.get(account.id) ?? 0) / 60)]),
  );
}

export function hydratePlanDraft(
  current: PlanDraft | null,
  next: Omit<PlanDraft, 'dirty'>,
): PlanDraft {
  if (current?.weekStart === next.weekStart && current.dirty) return current;
  if (current?.weekStart === next.weekStart && current.sourceKey === next.sourceKey) return current;
  return { ...next, dirty: false };
}

export function editPlanDraft(
  current: PlanDraft,
  accountId: string,
  value: string,
): PlanDraft {
  return {
    ...current,
    hours: { ...current.hours, [accountId]: value },
    dirty: true,
  };
}

export function markPlanDraftSaved(
  current: PlanDraft,
  savedHours: Readonly<Record<string, string>> = current.hours,
  savedWeekStart: string = current.weekStart,
): PlanDraft {
  if (current.weekStart !== savedWeekStart || current.hours !== savedHours) return current;
  return current.dirty ? { ...current, dirty: false } : current;
}
