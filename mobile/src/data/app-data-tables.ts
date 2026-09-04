export const APP_DATA_TABLE_NAMES = [
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
  'analysis_sessions',
  'ai_proposals',
  'settings',
  'sync_outbox',
  'sync_conflicts',
  'sync_state',
] as const;

export type AppDataTableName = (typeof APP_DATA_TABLE_NAMES)[number];

export const APP_DATA_RESET_ORDER: readonly AppDataTableName[] = [...APP_DATA_TABLE_NAMES].reverse();
