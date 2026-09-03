import { addDays, dateKey, scheduleMatchesDate, weekRange } from '@/domain/calculations';
import type { AppSnapshot, Entry, Item, WeeklyPlan } from '@/types/domain';

export interface AnalysisTextNote {
  date: string;
  text: string;
}

export interface AnalysisWeeklyComment {
  weekStart: string;
  text: string;
}

export interface AnalysisPackageOptions {
  rangeStart: string;
  rangeEnd: string;
  generatedAt: string;
  weekStartDay: number;
  includeNotes: boolean;
  tokenBudget?: number;
}

export interface AnalysisDataSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  range: { start: string; end: string };
  aggregationLevel: 'daily' | 'weekly';
  omissions: string[];
  accounts: { id: string; name: string }[];
  items: {
    id: string;
    accountId: string;
    projectId: string | null;
    name: string;
    type: string;
    unit: string | null;
    levelMin: number | null;
    levelTarget: number | null;
    levelMax: number | null;
    defaultDurationMin: number | null;
    schedules: { weekdayMask: number; plannedValue: number | null; startTime: string | null }[];
  }[];
  planVersions: {
    id: string;
    weekStart: string;
    version: number;
    source: string;
    createdAt: string;
    lines: { accountId: string; plannedMinutes: number }[];
  }[];
  daily: {
    date: string;
    actualMinutes: number;
    byAccount: { accountId: string; actualMinutes: number }[];
  }[];
  weekly: {
    weekStart: string;
    plannedMinutes: number;
    actualMinutes: number;
    differenceMinutes: number;
    byAccount: { accountId: string; plannedMinutes: number; actualMinutes: number; differenceMinutes: number }[];
  }[];
  itemActuals: {
    itemId: string;
    scheduledPlannedMinutes: number;
    expectedMinutesFromDefaults: number;
    timeMinutes: number;
    differenceFromScheduleMinutes: number;
    differenceFromDefaultMinutes: number;
    count: number;
    valueTotal: number;
    lastValue: number | null;
    recordCount: number;
  }[];
  projects: {
    id: string;
    name: string;
    status: string;
    currentExperiment: string | null;
    nextDecisionDate: string | null;
    itemIds: string[];
    scheduledPlannedMinutes: number;
    timeMinutes: number;
    differenceMinutes: number;
    weeklyTime: { weekStart: string; actualMinutes: number }[];
    kpis: {
      id: string;
      label: string;
      unit: string | null;
      aggregation: string;
      records: { value: number; occurredAt: string; note: string | null }[];
    }[];
  }[];
  notes: AnalysisTextNote[];
  weeklyComments: AnalysisWeeklyComment[];
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function entryDate(entry: Entry): string {
  return dateKey(new Date(entry.occurredAt));
}

function latestPlansByWeek(plans: readonly WeeklyPlan[]): Map<string, WeeklyPlan> {
  const latest = new Map<string, WeeklyPlan>();
  for (const plan of plans) {
    const current = latest.get(plan.weekStart);
    if (!current || plan.version > current.version) latest.set(plan.weekStart, plan);
  }
  return latest;
}

function addToMap(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function dateKeysInRange(start: string, end: string): string[] {
  const keys: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) keys.push(current);
  return keys;
}

function scheduledMinutes(
  item: Item,
  schedules: AppSnapshot['schedules'],
  dates: readonly string[],
): number {
  if (item.type !== 'time') return 0;
  return schedules
    .filter((schedule) => schedule.itemId === item.id && !schedule.deletedAt && schedule.autoCreate)
    .reduce((total, schedule) => total + dates.reduce(
      (sum, day) => sum + (scheduleMatchesDate(schedule, day) ? (schedule.plannedValue ?? item.defaultDurationMin ?? 0) : 0),
      0,
    ), 0);
}

function serialize(snapshot: AnalysisDataSnapshot): string {
  return JSON.stringify(snapshot);
}

export function estimateSnapshotTokens(snapshot: AnalysisDataSnapshot): number {
  return Math.ceil(serialize(snapshot).length / 4);
}

export function buildAnalysisSnapshot(
  source: AppSnapshot,
  dayNotes: readonly AnalysisTextNote[],
  weeklyComments: readonly AnalysisWeeklyComment[],
  options: AnalysisPackageOptions,
): AnalysisDataSnapshot {
  const tokenBudget = options.tokenBudget ?? 16_000;
  const activeAccounts = source.accounts.filter((account) => !account.deletedAt);
  const activeItems = source.items.filter((item) => !item.deletedAt);
  const activeSchedules = source.schedules.filter((schedule) => !schedule.deletedAt);
  const rangeDates = dateKeysInRange(options.rangeStart, options.rangeEnd);
  const entries = source.entries.filter((entry) => !entry.deletedAt && inRange(entryDate(entry), options.rangeStart, options.rangeEnd));
  const plans = source.plans.filter(
    (plan) => plan.weekStart <= options.rangeEnd && addDays(plan.weekStart, 6) >= options.rangeStart,
  );
  const activeProjects = source.projects.filter((project) => !project.deletedAt);
  const activeKpis = source.kpis.filter((kpi) => !kpi.deletedAt);
  const kpiRecords = source.kpiRecords.filter(
    (record) => !record.deletedAt && inRange(dateKey(new Date(record.occurredAt)), options.rangeStart, options.rangeEnd),
  );

  const planVersions = plans.map((plan) => ({
    id: plan.id,
    weekStart: plan.weekStart,
    version: plan.version,
    source: plan.source,
    createdAt: plan.createdAt,
    lines: source.planLines
      .filter((line) => line.weeklyPlanId === plan.id)
      .map((line) => ({ accountId: line.accountId, plannedMinutes: line.plannedMinutes })),
  }));
  const latestPlans = latestPlansByWeek(plans);

  const dailyTotals = new Map<string, number>();
  const dailyAccounts = new Map<string, Map<string, number>>();
  const weeklyTotals = new Map<string, number>();
  const weeklyAccounts = new Map<string, Map<string, number>>();
  const itemTotals = new Map<string, { timeMinutes: number; count: number; valueTotal: number; lastValue: number | null; lastAt: string; recordCount: number }>();

  for (const entry of entries) {
    const day = entryDate(entry);
    const weekStart = weekRange(day, options.weekStartDay).start;
    const minutes = entry.type === 'time' ? Math.max(0, entry.durationMin ?? 0) : 0;
    addToMap(dailyTotals, day, minutes);
    addToMap(weeklyTotals, weekStart, minutes);
    const dayAccounts = dailyAccounts.get(day) ?? new Map<string, number>();
    addToMap(dayAccounts, entry.accountId, minutes);
    dailyAccounts.set(day, dayAccounts);
    const weekAccounts = weeklyAccounts.get(weekStart) ?? new Map<string, number>();
    addToMap(weekAccounts, entry.accountId, minutes);
    weeklyAccounts.set(weekStart, weekAccounts);

    const current = itemTotals.get(entry.itemId) ?? {
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
    itemTotals.set(entry.itemId, current);
  }

  const weekKeys = new Set<string>([...latestPlans.keys(), ...weeklyTotals.keys()]);
  const weekly = [...weekKeys].sort().map((weekStart) => {
    const plan = latestPlans.get(weekStart);
    const plannedByAccount = new Map<string, number>();
    if (plan) {
      for (const line of source.planLines.filter((candidate) => candidate.weeklyPlanId === plan.id)) {
        addToMap(plannedByAccount, line.accountId, line.plannedMinutes);
      }
    }
    const actualByAccount = weeklyAccounts.get(weekStart) ?? new Map<string, number>();
    const accountIds = new Set<string>([...plannedByAccount.keys(), ...actualByAccount.keys()]);
    const byAccount = [...accountIds].map((accountId) => {
      const plannedMinutes = plannedByAccount.get(accountId) ?? 0;
      const actualMinutes = actualByAccount.get(accountId) ?? 0;
      return { accountId, plannedMinutes, actualMinutes, differenceMinutes: actualMinutes - plannedMinutes };
    });
    const plannedMinutes = byAccount.reduce((sum, line) => sum + line.plannedMinutes, 0);
    const actualMinutes = byAccount.reduce((sum, line) => sum + line.actualMinutes, 0);
    return { weekStart, plannedMinutes, actualMinutes, differenceMinutes: actualMinutes - plannedMinutes, byAccount };
  });

  const snapshot: AnalysisDataSnapshot = {
    schemaVersion: 1,
    generatedAt: options.generatedAt,
    range: { start: options.rangeStart, end: options.rangeEnd },
    aggregationLevel: 'daily',
    omissions: [],
    accounts: activeAccounts.map((account) => ({ id: account.id, name: account.name })),
    items: activeItems.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      projectId: item.projectId,
      name: item.name,
      type: item.type,
      unit: item.unit,
      levelMin: item.levelMin,
      levelTarget: item.levelTarget,
      levelMax: item.levelMax,
      defaultDurationMin: item.defaultDurationMin,
      schedules: activeSchedules
        .filter((schedule) => schedule.itemId === item.id && schedule.autoCreate)
        .map((schedule) => ({
          weekdayMask: schedule.weekdayMask,
          plannedValue: schedule.plannedValue,
          startTime: schedule.startTime,
        })),
    })),
    planVersions,
    daily: [...dailyTotals.keys()].sort().map((day) => ({
      date: day,
      actualMinutes: dailyTotals.get(day) ?? 0,
      byAccount: [...(dailyAccounts.get(day) ?? new Map<string, number>())].map(([accountId, actualMinutes]) => ({ accountId, actualMinutes })),
    })),
    weekly,
    itemActuals: activeItems.map((item) => {
      const totals = itemTotals.get(item.id) ?? {
        timeMinutes: 0,
        count: 0,
        valueTotal: 0,
        lastValue: null,
        lastAt: '',
        recordCount: 0,
      };
      const scheduledPlannedMinutes = scheduledMinutes(item, activeSchedules, rangeDates);
      const expectedMinutesFromDefaults = item.type === 'time'
        ? totals.recordCount * (item.defaultDurationMin ?? 0)
        : 0;
      return {
        itemId: item.id,
        scheduledPlannedMinutes,
        expectedMinutesFromDefaults,
        timeMinutes: totals.timeMinutes,
        differenceFromScheduleMinutes: totals.timeMinutes - scheduledPlannedMinutes,
        differenceFromDefaultMinutes: totals.timeMinutes - expectedMinutesFromDefaults,
        count: totals.count,
        valueTotal: totals.valueTotal,
        lastValue: totals.lastValue,
        recordCount: totals.recordCount,
      };
    }),
    projects: activeProjects.map((project) => {
      const projectItems = activeItems.filter((item) => item.projectId === project.id);
      const projectItemIds = new Set(projectItems.map((item) => item.id));
      const projectEntries = entries.filter((entry) => projectItemIds.has(entry.itemId) && entry.type === 'time');
      const projectWeekly = new Map<string, number>();
      for (const entry of projectEntries) {
        addToMap(projectWeekly, weekRange(entryDate(entry), options.weekStartDay).start, Math.max(0, entry.durationMin ?? 0));
      }
      const scheduledPlannedMinutes = projectItems.reduce(
        (sum, item) => sum + scheduledMinutes(item, activeSchedules, rangeDates),
        0,
      );
      const timeMinutes = projectEntries.reduce((sum, entry) => sum + Math.max(0, entry.durationMin ?? 0), 0);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        currentExperiment: project.currentExperiment,
        nextDecisionDate: project.nextDecisionDate,
        itemIds: [...projectItemIds],
        scheduledPlannedMinutes,
        timeMinutes,
        differenceMinutes: timeMinutes - scheduledPlannedMinutes,
        weeklyTime: [...projectWeekly]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([weekStart, actualMinutes]) => ({ weekStart, actualMinutes })),
        kpis: activeKpis.filter((kpi) => kpi.projectId === project.id).map((kpi) => ({
          id: kpi.id,
          label: kpi.label,
          unit: kpi.unit,
          aggregation: kpi.aggregation,
          records: kpiRecords.filter((record) => record.kpiId === kpi.id).map((record) => ({
            value: record.value,
            occurredAt: record.occurredAt,
            note: record.note,
          })),
        })),
      };
    }),
    notes: options.includeNotes
      ? dayNotes.filter((note) => inRange(note.date, options.rangeStart, options.rangeEnd)).sort((left, right) => right.date.localeCompare(left.date))
      : [],
    weeklyComments: options.includeNotes
      ? weeklyComments.filter((comment) => inRange(comment.weekStart, options.rangeStart, options.rangeEnd)).sort((left, right) => right.weekStart.localeCompare(left.weekStart))
      : [],
  };

  while (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.notes.length > 0) {
    snapshot.notes.pop();
    if (!snapshot.omissions.includes('오래된 하루 메모 일부')) snapshot.omissions.push('오래된 하루 메모 일부');
  }
  while (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.weeklyComments.length > 0) {
    snapshot.weeklyComments.pop();
    if (!snapshot.omissions.includes('오래된 주간 코멘트 일부')) snapshot.omissions.push('오래된 주간 코멘트 일부');
  }
  if (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.daily.length > 0) {
    snapshot.daily = [];
    snapshot.aggregationLevel = 'weekly';
    snapshot.omissions.push('일 단위 집계를 주 단위로 상향');
  }

  return snapshot;
}
