begin;

alter table public.oos_sync_records
  drop constraint if exists oos_sync_records_table_name_check;

alter table public.oos_sync_records
  add constraint oos_sync_records_table_name_check check (table_name in (
    'accounts','projects','items','item_schedules','project_kpis','project_kpi_records',
    'weekly_plans','weekly_plan_lines','entries','day_notes','day_closures','weekly_comments',
    'today_item_additions','analysis_sessions','ai_proposals','settings'
  ));

commit;
