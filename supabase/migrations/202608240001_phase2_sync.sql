begin;
create sequence if not exists public.sync_version_seq as bigint;
create table if not exists public.sync_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null check (table_name in (
    'accounts','projects','items','item_schedules','project_kpis','project_kpi_records',
    'weekly_plans','weekly_plan_lines','entries','day_notes','day_closures','weekly_comments',
    'today_item_additions','settings'
  )),
  row_id text not null,
  payload jsonb,
  is_deleted boolean not null default false,
  server_version bigint not null,
  server_updated_at timestamptz not null,
  client_updated_at timestamptz not null,
  mutation_id uuid not null,
  device_id uuid not null,
  primary key (user_id, table_name, row_id),
  unique (user_id, mutation_id),
  check ((not is_deleted and payload is not null) or is_deleted)
);
create table if not exists public.sync_mutations (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  table_name text not null,
  row_id text not null,
  operation text not null check (operation in ('upsert','delete')),
  payload jsonb,
  is_deleted boolean not null,
  base_server_version bigint not null,
  client_updated_at timestamptz not null,
  device_id uuid not null,
  applied_version bigint not null,
  applied_at timestamptz not null,
  primary key (user_id, mutation_id)
);
create table if not exists public.sync_conflicts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  row_id text not null,
  previous_payload jsonb,
  incoming_payload jsonb,
  winner_payload jsonb,
  previous_version bigint not null,
  incoming_base_version bigint not null,
  resolved_version bigint not null,
  previous_device_id uuid,
  incoming_device_id uuid not null,
  incoming_mutation_id uuid not null,
  reason text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, incoming_mutation_id)
);
create index if not exists idx_sync_records_user_version
  on public.sync_records(user_id, server_version);
create index if not exists idx_sync_conflicts_user_created
  on public.sync_conflicts(user_id, created_at desc);
alter table public.sync_records enable row level security;
alter table public.sync_mutations enable row level security;
alter table public.sync_conflicts enable row level security;
revoke all on table public.sync_records from anon, authenticated;
revoke all on table public.sync_mutations from anon, authenticated;
revoke all on table public.sync_conflicts from anon, authenticated;
grant select on table public.sync_records to authenticated;
grant select on table public.sync_conflicts to authenticated;
drop policy if exists sync_records_select_own on public.sync_records;
create policy sync_records_select_own
  on public.sync_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists sync_conflicts_select_own on public.sync_conflicts;
create policy sync_conflicts_select_own
  on public.sync_conflicts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
create or replace function public.apply_sync_mutation(
  p_mutation_id uuid,
  p_table_name text,
  p_row_id text,
  p_operation text,
  p_payload jsonb,
  p_base_server_version bigint,
  p_client_updated_at timestamptz,
  p_device_id uuid
)
returns table (
  table_name text,
  row_id text,
  payload jsonb,
  is_deleted boolean,
  server_version bigint,
  server_updated_at timestamptz,
  mutation_id uuid,
  device_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.sync_records%rowtype;
  v_previous_exists boolean := false;
  v_existing public.sync_mutations%rowtype;
  v_existing_mutation boolean := false;
  v_version bigint;
  v_applied_at timestamptz;
  v_payload jsonb;
  v_is_deleted boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_table_name <> all (array[
    'accounts','projects','items','item_schedules','project_kpis','project_kpi_records',
    'weekly_plans','weekly_plan_lines','entries','day_notes','day_closures','weekly_comments',
    'today_item_additions','settings'
  ]) then
    raise exception 'unsupported sync table: %', p_table_name using errcode = '22023';
  end if;
  if p_operation not in ('upsert','delete') then
    raise exception 'unsupported sync operation: %', p_operation using errcode = '22023';
  end if;
  if p_operation = 'upsert' and (p_payload is null or jsonb_typeof(p_payload) <> 'object') then
    raise exception 'upsert payload must be an object' using errcode = '22023';
  end if;
  if p_operation = 'upsert' and p_table_name = 'settings' and p_payload ->> 'key' is distinct from p_row_id then
    raise exception 'settings key does not match row_id' using errcode = '22023';
  end if;
  if p_operation = 'upsert' and p_table_name <> 'settings' and p_payload ->> 'id' is distinct from p_row_id then
    raise exception 'payload id does not match row_id' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_existing
  from public.sync_mutations
  where user_id = v_user_id and mutation_id = p_mutation_id;
  v_existing_mutation := found;

  if v_existing_mutation then
    return query
      select v_existing.table_name, v_existing.row_id, v_existing.payload, v_existing.is_deleted,
             v_existing.applied_version, v_existing.applied_at, v_existing.mutation_id, v_existing.device_id;
    return;
  end if;

  select * into v_current
  from public.sync_records
  where user_id = v_user_id and table_name = p_table_name and row_id = p_row_id
  for update;
  v_previous_exists := found;

  v_version := nextval('public.sync_version_seq');
  v_applied_at := clock_timestamp();
  v_is_deleted := p_operation = 'delete';
  v_payload := case
    when v_is_deleted then coalesce(v_current.payload, p_payload)
    else p_payload
  end;

  insert into public.sync_records (
    user_id,table_name,row_id,payload,is_deleted,server_version,server_updated_at,
    client_updated_at,mutation_id,device_id
  ) values (
    v_user_id,p_table_name,p_row_id,v_payload,v_is_deleted,v_version,v_applied_at,
    p_client_updated_at,p_mutation_id,p_device_id
  )
  on conflict (user_id,table_name,row_id) do update set
    payload = excluded.payload,
    is_deleted = excluded.is_deleted,
    server_version = excluded.server_version,
    server_updated_at = excluded.server_updated_at,
    client_updated_at = excluded.client_updated_at,
    mutation_id = excluded.mutation_id,
    device_id = excluded.device_id;

  insert into public.sync_mutations (
    user_id,mutation_id,table_name,row_id,operation,payload,is_deleted,base_server_version,
    client_updated_at,device_id,applied_version,applied_at
  ) values (
    v_user_id,p_mutation_id,p_table_name,p_row_id,p_operation,v_payload,v_is_deleted,
    p_base_server_version,p_client_updated_at,p_device_id,v_version,v_applied_at
  );

  if v_previous_exists and v_current.server_version <> p_base_server_version then
    insert into public.sync_conflicts (
      user_id,table_name,row_id,previous_payload,incoming_payload,winner_payload,
      previous_version,incoming_base_version,resolved_version,previous_device_id,
      incoming_device_id,incoming_mutation_id,reason,created_at
    ) values (
      v_user_id,p_table_name,p_row_id,v_current.payload,p_payload,v_payload,
      v_current.server_version,p_base_server_version,v_version,v_current.device_id,
      p_device_id,p_mutation_id,'base_server_version_mismatch',v_applied_at
    );
  end if;

  return query
    select p_table_name, p_row_id, v_payload, v_is_deleted, v_version, v_applied_at,
           p_mutation_id, p_device_id;
end;
$$;
revoke all on function public.apply_sync_mutation(uuid,text,text,text,jsonb,bigint,timestamptz,uuid) from public, anon;
grant execute on function public.apply_sync_mutation(uuid,text,text,text,jsonb,bigint,timestamptz,uuid) to authenticated;
commit;
