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
