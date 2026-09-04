import { addDays, dateKey, weekRange } from '@/domain/calculations';
import type { AppSnapshot } from '@/types/domain';

import {
  addToMap,
  aggregateEntries,
  buildWeeklyRows,
  dateKeysInRange,
  entryDate,
  inRange,
  latestPlansByWeek,
  scheduledMinutes,
} from './packager-calculations';
import { redactNullableText, redactSensitiveText } from './redaction';
import { applySnapshotTokenBudget } from './snapshot-budget';
import type {
  AnalysisDataSnapshot,
  AnalysisPackageOptions,
  AnalysisTextNote,
  AnalysisWeeklyComment,
} from './snapshot-types';

export {
  estimateSnapshotTokens,
  serializeAnalysisSnapshot,
  utf8ByteLength,
} from './snapshot-budget';

export function buildAnalysisSnapshot(
  source: AppSnapshot,
  dayNotes: readonly AnalysisTextNote[],
  weeklyComments: readonly AnalysisWeeklyComment[],
  options: AnalysisPackageOptions,
): AnalysisDataSnapshot {
  const tokenBudget = options.tokenBudget ?? 16_000;
  const activeAccounts = source.accounts.filter((account) => !account.deletedAt && !account.archived);
  const activeAccountIds = new Set(activeAccounts.map((account) => account.id));
  const activeItems = source.items.filter(
    (item) => !item.deletedAt && !item.archived && activeAccountIds.has(item.accountId),
  );
  const activeItemIds = new Set(activeItems.map((item) => item.id));
  const activeSchedules = source.schedules.filter(
    (schedule) => !schedule.deletedAt && activeItemIds.has(schedule.itemId),
  );
  const activePlanLines = source.planLines.filter(
    (line) => !line.deletedAt && activeAccountIds.has(line.accountId),
  );
  const rangeDates = dateKeysInRange(options.rangeStart, options.rangeEnd);
  const entries = source.entries.filter(
    (entry) => !entry.deletedAt
      && activeAccountIds.has(entry.accountId)
      && activeItemIds.has(entry.itemId)
      && inRange(entryDate(entry), options.rangeStart, options.rangeEnd),
  );
  const plans = source.plans.filter(
    (plan) => !plan.deletedAt && plan.weekStart <= options.rangeEnd && addDays(plan.weekStart, 6) >= options.rangeStart,
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
    lines: activePlanLines
      .filter((line) => line.weeklyPlanId === plan.id)
      .map((line) => ({ accountId: line.accountId, plannedMinutes: line.plannedMinutes })),
  }));
  const latestPlans = latestPlansByWeek(plans);

  const aggregates = aggregateEntries(entries, options.weekStartDay);
  const weekly = buildWeeklyRows(latestPlans, activePlanLines, aggregates);

  const snapshot: AnalysisDataSnapshot = {
    schemaVersion: 1,
    generatedAt: options.generatedAt,
    range: { start: options.rangeStart, end: options.rangeEnd },
    aggregationLevel: 'daily',
    omissions: options.includeNotes ? [] : ['하루 메모, 주간 코멘트, KPI 기록 메모'],
    accounts: activeAccounts.map((account) => ({ id: account.id, name: redactSensitiveText(account.name) })),
    items: activeItems.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      projectId: item.projectId,
      name: redactSensitiveText(item.name),
      type: item.type,
      unit: redactNullableText(item.unit),
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
    daily: [...aggregates.dailyTotals.keys()].sort().map((day) => ({
      date: day,
      actualMinutes: aggregates.dailyTotals.get(day) ?? 0,
      byAccount: [...(aggregates.dailyAccounts.get(day) ?? new Map<string, number>())]
        .map(([accountId, actualMinutes]) => ({ accountId, actualMinutes })),
    })),
    weekly,
    itemActuals: activeItems.map((item) => {
      const totals = aggregates.itemTotals.get(item.id) ?? {
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
        name: redactSensitiveText(project.name),
        status: project.status,
        currentExperiment: redactNullableText(project.currentExperiment),
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
          label: redactSensitiveText(kpi.label),
          unit: redactNullableText(kpi.unit),
          aggregation: kpi.aggregation,
          records: kpiRecords.filter((record) => record.kpiId === kpi.id).map((record) => ({
            value: record.value,
            occurredAt: record.occurredAt,
            note: options.includeNotes ? redactNullableText(record.note) : null,
          })),
        })),
      };
    }),
    notes: options.includeNotes
      ? dayNotes
        .filter((note) => inRange(note.date, options.rangeStart, options.rangeEnd))
        .sort((left, right) => right.date.localeCompare(left.date))
        .map((note) => ({ ...note, text: redactSensitiveText(note.text) }))
      : [],
    weeklyComments: options.includeNotes
      ? weeklyComments
        .filter((comment) => inRange(comment.weekStart, options.rangeStart, options.rangeEnd))
        .sort((left, right) => right.weekStart.localeCompare(left.weekStart))
        .map((comment) => ({ ...comment, text: redactSensitiveText(comment.text) }))
      : [],
  };

  const latestPlanIds = new Set([...latestPlans.values()].map((plan) => plan.id));
  return applySnapshotTokenBudget(snapshot, tokenBudget, latestPlanIds);
}
