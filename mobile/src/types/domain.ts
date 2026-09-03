export type ItemType = 'time' | 'completion' | 'count' | 'numeric' | 'event';
export type EntrySource = 'app' | 'import' | 'ai_applied';
export type PlanSource = 'app' | 'copy_last_week' | 'ai_applied';
export type ProjectStatus = 'active' | 'paused' | 'closed';
export type Aggregation = 'sum' | 'last' | 'max';

export interface Account {
  id: string;
  name: string;
  color: string | null;
  kind: string | null;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  currentExperiment: string | null;
  nextDecisionDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Item {
  id: string;
  accountId: string;
  projectId: string | null;
  name: string;
  type: ItemType;
  unit: string | null;
  levelMin: number | null;
  levelTarget: number | null;
  levelMax: number | null;
  defaultDurationMin: number | null;
  countOnComplete: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ItemSchedule {
  id: string;
  itemId: string;
  weekdayMask: number;
  plannedValue: number | null;
  startTime: string | null;
  autoCreate: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Entry {
  id: string;
  itemId: string;
  accountId: string;
  type: ItemType;
  startedAt: string | null;
  endedAt: string | null;
  durationMin: number | null;
  value: number | null;
  count: number | null;
  occurredAt: string;
  note: string | null;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  version: number;
  note: string | null;
  source: PlanSource;
  createdAt: string;
}

export interface WeeklyPlanLine {
  id: string;
  weeklyPlanId: string;
  accountId: string;
  plannedMinutes: number;
}

export interface ProjectKpi {
  id: string;
  projectId: string;
  key: string;
  label: string;
  unit: string | null;
  aggregation: Aggregation;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectKpiRecord {
  id: string;
  kpiId: string;
  value: number;
  occurredAt: string;
  note: string | null;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DayClosure {
  id: string;
  date: string;
  closedAt: string;
  plannedMinutes: number;
  actualMinutes: number;
  snapshotJson: string;
  note: string | null;
}

export interface TodayItem {
  item: Item;
  plannedValue: number | null;
  schedule: ItemSchedule | null;
}

export interface AppSnapshot {
  accounts: Account[];
  projects: Project[];
  items: Item[];
  schedules: ItemSchedule[];
  entries: Entry[];
  plans: WeeklyPlan[];
  planLines: WeeklyPlanLine[];
  kpis: ProjectKpi[];
  kpiRecords: ProjectKpiRecord[];
  closures: DayClosure[];
  manualTodayItemIds: string[];
  settings: Record<string, string>;
}

export interface ItemInput {
  id?: string;
  name: string;
  accountId: string;
  projectId: string | null;
  type: ItemType;
  unit: string | null;
  levelMin: number | null;
  levelTarget: number | null;
  levelMax: number | null;
  defaultDurationMin: number | null;
  countOnComplete: boolean;
  weekdayMask: number;
  plannedValue: number | null;
  startTime: string | null;
  autoCreate: boolean;
}

export interface ProjectInput {
  id?: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  currentExperiment: string | null;
  nextDecisionDate: string | null;
}
