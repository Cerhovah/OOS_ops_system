import {
  sqliteBoolean,
  sqliteNullableNumber,
  sqliteNullableText,
  sqliteNumber,
  sqliteText,
  type SqlRow,
} from '@/data/sqlite-row';
import type {
  Account,
  Aggregation,
  DayClosure,
  Entry,
  Item,
  ItemSchedule,
  ItemType,
  PlanSource,
  Project,
  ProjectKpi,
  ProjectKpiRecord,
  WeeklyPlan,
  WeeklyPlanLine,
} from '@/types/domain';

export function accountFromRow(row: SqlRow): Account {
  return {
    id: sqliteText(row, 'id'),
    name: sqliteText(row, 'name'),
    color: sqliteNullableText(row, 'color'),
    kind: sqliteNullableText(row, 'kind'),
    sortOrder: sqliteNumber(row, 'sort_order'),
    archived: sqliteBoolean(row, 'archived'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function projectFromRow(row: SqlRow): Project {
  return {
    id: sqliteText(row, 'id'),
    name: sqliteText(row, 'name'),
    description: sqliteNullableText(row, 'description'),
    status: sqliteText(row, 'status') as Project['status'],
    currentExperiment: sqliteNullableText(row, 'current_experiment'),
    nextDecisionDate: sqliteNullableText(row, 'next_decision_date'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function itemFromRow(row: SqlRow): Item {
  return {
    id: sqliteText(row, 'id'),
    accountId: sqliteText(row, 'account_id'),
    projectId: sqliteNullableText(row, 'project_id'),
    name: sqliteText(row, 'name'),
    type: sqliteText(row, 'type') as ItemType,
    unit: sqliteNullableText(row, 'unit'),
    levelMin: sqliteNullableNumber(row, 'level_min'),
    levelTarget: sqliteNullableNumber(row, 'level_target'),
    levelMax: sqliteNullableNumber(row, 'level_max'),
    defaultDurationMin: sqliteNullableNumber(row, 'default_duration_min'),
    countOnComplete: sqliteBoolean(row, 'count_on_complete'),
    sortOrder: sqliteNumber(row, 'sort_order'),
    archived: sqliteBoolean(row, 'archived'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function scheduleFromRow(row: SqlRow): ItemSchedule {
  return {
    id: sqliteText(row, 'id'),
    itemId: sqliteText(row, 'item_id'),
    weekdayMask: sqliteNumber(row, 'weekday_mask'),
    plannedValue: sqliteNullableNumber(row, 'planned_value'),
    startTime: sqliteNullableText(row, 'start_time'),
    autoCreate: sqliteBoolean(row, 'auto_create'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function entryFromRow(row: SqlRow): Entry {
  return {
    id: sqliteText(row, 'id'),
    itemId: sqliteText(row, 'item_id'),
    accountId: sqliteText(row, 'account_id'),
    type: sqliteText(row, 'type') as ItemType,
    startedAt: sqliteNullableText(row, 'started_at'),
    endedAt: sqliteNullableText(row, 'ended_at'),
    durationMin: sqliteNullableNumber(row, 'duration_min'),
    value: sqliteNullableNumber(row, 'value'),
    count: sqliteNullableNumber(row, 'count'),
    occurredAt: sqliteText(row, 'occurred_at'),
    note: sqliteNullableText(row, 'note'),
    source: sqliteText(row, 'source') as Entry['source'],
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function planFromRow(row: SqlRow): WeeklyPlan {
  return {
    id: sqliteText(row, 'id'),
    weekStart: sqliteText(row, 'week_start'),
    version: sqliteNumber(row, 'version'),
    note: sqliteNullableText(row, 'note'),
    source: sqliteText(row, 'source') as PlanSource,
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function planLineFromRow(row: SqlRow): WeeklyPlanLine {
  return {
    id: sqliteText(row, 'id'),
    weeklyPlanId: sqliteText(row, 'weekly_plan_id'),
    accountId: sqliteText(row, 'account_id'),
    plannedMinutes: sqliteNumber(row, 'planned_minutes'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function kpiFromRow(row: SqlRow): ProjectKpi {
  return {
    id: sqliteText(row, 'id'),
    projectId: sqliteText(row, 'project_id'),
    key: sqliteText(row, 'key'),
    label: sqliteText(row, 'label'),
    unit: sqliteNullableText(row, 'unit'),
    aggregation: sqliteText(row, 'aggregation') as Aggregation,
    sortOrder: sqliteNumber(row, 'sort_order'),
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function kpiRecordFromRow(row: SqlRow): ProjectKpiRecord {
  return {
    id: sqliteText(row, 'id'),
    kpiId: sqliteText(row, 'kpi_id'),
    value: sqliteNumber(row, 'value'),
    occurredAt: sqliteText(row, 'occurred_at'),
    note: sqliteNullableText(row, 'note'),
    source: sqliteText(row, 'source') as ProjectKpiRecord['source'],
    createdAt: sqliteText(row, 'created_at'),
    updatedAt: sqliteText(row, 'updated_at'),
    deletedAt: sqliteNullableText(row, 'deleted_at'),
  };
}

export function closureFromRow(row: SqlRow): DayClosure {
  return {
    id: sqliteText(row, 'id'),
    date: sqliteText(row, 'date'),
    closedAt: sqliteText(row, 'closed_at'),
    plannedMinutes: sqliteNumber(row, 'planned_minutes'),
    actualMinutes: sqliteNumber(row, 'actual_minutes'),
    snapshotJson: sqliteText(row, 'snapshot_json'),
    note: sqliteNullableText(row, 'note'),
  };
}
