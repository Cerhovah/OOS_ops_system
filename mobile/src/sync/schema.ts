import type { AppDataTableName } from '@/data/app-data-tables';

export type SyncScalar = string | number | null;

export const syncTableDefinitions = [
  {
    name: 'accounts',
    primaryKey: 'id',
    columns: ['id', 'name', 'color', 'kind', 'sort_order', 'archived', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'projects',
    primaryKey: 'id',
    columns: ['id', 'name', 'description', 'status', 'current_experiment', 'next_decision_date', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'items',
    primaryKey: 'id',
    columns: [
      'id', 'account_id', 'project_id', 'name', 'type', 'unit', 'level_min', 'level_target', 'level_max',
      'default_duration_min', 'count_on_complete', 'sort_order', 'archived', 'created_at', 'updated_at', 'deleted_at',
    ],
  },
  {
    name: 'item_schedules',
    primaryKey: 'id',
    columns: ['id', 'item_id', 'weekday_mask', 'planned_value', 'start_time', 'auto_create', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'project_kpis',
    primaryKey: 'id',
    columns: ['id', 'project_id', 'key', 'label', 'unit', 'aggregation', 'sort_order', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'project_kpi_records',
    primaryKey: 'id',
    columns: ['id', 'kpi_id', 'value', 'occurred_at', 'note', 'source', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'weekly_plans',
    primaryKey: 'id',
    columns: ['id', 'week_start', 'version', 'note', 'source', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'weekly_plan_lines',
    primaryKey: 'id',
    columns: ['id', 'weekly_plan_id', 'account_id', 'planned_minutes', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'entries',
    primaryKey: 'id',
    columns: [
      'id', 'item_id', 'account_id', 'type', 'started_at', 'ended_at', 'duration_min', 'value', 'count',
      'occurred_at', 'note', 'source', 'created_at', 'updated_at', 'deleted_at',
    ],
  },
  {
    name: 'day_notes',
    primaryKey: 'id',
    columns: ['id', 'date', 'text', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'day_closures',
    primaryKey: 'id',
    columns: ['id', 'date', 'closed_at', 'planned_minutes', 'actual_minutes', 'snapshot_json', 'note', 'updated_at', 'deleted_at'],
  },
  {
    name: 'weekly_comments',
    primaryKey: 'id',
    columns: ['id', 'week_start', 'text', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'today_item_additions',
    primaryKey: 'id',
    columns: ['id', 'date', 'item_id', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'analysis_sessions',
    primaryKey: 'id',
    columns: [
      'id', 'mode', 'question', 'range_start', 'range_end', 'data_snapshot_json', 'response_text',
      'provider', 'model', 'reasoning_effort', 'input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd',
      'provider_response_id', 'started_at', 'finished_at',
      'created_at', 'updated_at', 'deleted_at',
    ],
  },
  {
    name: 'ai_proposals',
    primaryKey: 'id',
    columns: [
      'id', 'session_id', 'kind', 'payload_json', 'rationale', 'status', 'applied_at',
      'created_at', 'updated_at', 'deleted_at',
    ],
  },
  {
    name: 'settings',
    primaryKey: 'key',
    columns: ['key', 'value', 'updated_at'],
  },
] as const satisfies readonly {
  readonly name: AppDataTableName;
  readonly primaryKey: 'id' | 'key';
  readonly columns: readonly string[];
}[];

export type SyncTableName = (typeof syncTableDefinitions)[number]['name'];

export interface SyncTableDefinition {
  readonly name: SyncTableName;
  readonly primaryKey: 'id' | 'key';
  readonly columns: readonly string[];
}

const definitionMap = new Map<string, SyncTableDefinition>(
  syncTableDefinitions.map((definition) => [definition.name, definition]),
);

export const SYNC_BOOTSTRAP_SETTING_KEYS = [
  'week_start_day',
  'day_end_time',
  'close_notification_time',
  'close_notification_enabled',
  'notification_always',
  'timer_limit_notifications_enabled',
  'time_zone',
] as const;

export const SYNC_BOOTSTRAP_TABLE_NAMES = [
  'accounts',
  'projects',
  'items',
  'item_schedules',
  'project_kpis',
  'project_kpi_records',
  'weekly_plans',
  'weekly_plan_lines',
  'entries',
  'day_notes',
  'day_closures',
  'weekly_comments',
  'today_item_additions',
] as const satisfies readonly SyncTableName[];

export const SYNC_BOOTSTRAP_RESET_ORDER: readonly SyncTableName[] = [
  ...SYNC_BOOTSTRAP_TABLE_NAMES,
].reverse();

export const SYNCABLE_SETTING_KEYS = [
  ...SYNC_BOOTSTRAP_SETTING_KEYS,
  'ai_provider',
  'ai_model',
  'analysis_range_weeks',
  'analysis_include_notes',
] as const;

export const SYNCABLE_SETTING_PREFIX = 'item_notification:';

const syncableSettingKeys = new Set<string>(SYNCABLE_SETTING_KEYS);

export function getSyncTableDefinition(name: string): SyncTableDefinition | null {
  return definitionMap.get(name) ?? null;
}

export function isSyncTableName(name: string): name is SyncTableName {
  return definitionMap.has(name);
}

export function isSyncableSetting(key: string): boolean {
  return syncableSettingKeys.has(key) || key.startsWith(SYNCABLE_SETTING_PREFIX);
}
