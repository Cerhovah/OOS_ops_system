create table if not exists public.oos_sync_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null check (table_name in (
    'accounts','projects','items','item_schedules','project_kpis','project_kpi_records',
    'weekly_plans','weekly_plan_lines','entries','day_notes','day_closures','weekly_comments',
    'today_item_additions','settings'
  )),
  local_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, table_name, local_id)
);

create index if not exists oos_sync_records_user_server_idx
  on public.oos_sync_records (user_id, server_updated_at);

alter table public.oos_sync_records enable row level security;

revoke all on table public.oos_sync_records from anon;
grant select, insert, update, delete on table public.oos_sync_records to authenticated;

drop policy if exists "oos records select own" on public.oos_sync_records;
create policy "oos records select own"
  on public.oos_sync_records for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "oos records insert own" on public.oos_sync_records;
create policy "oos records insert own"
  on public.oos_sync_records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "oos records update own" on public.oos_sync_records;
create policy "oos records update own"
  on public.oos_sync_records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "oos records delete own" on public.oos_sync_records;
create policy "oos records delete own"
  on public.oos_sync_records for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.touch_oos_sync_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_oos_sync_record on public.oos_sync_records;
create trigger touch_oos_sync_record
before insert or update on public.oos_sync_records
for each row execute function public.touch_oos_sync_record();

create or replace function public.apply_oos_sync_records(p_records jsonb)
returns table(table_name text, local_id text, applied boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_affected integer;
  v_table_name text;
  v_local_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'p_records must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_records)
  loop
    v_table_name := v_item->>'table_name';
    v_local_id := v_item->>'local_id';
    if v_table_name is null or v_local_id is null or jsonb_typeof(v_item->'payload') <> 'object' then
      raise exception 'invalid sync record';
    end if;

    insert into public.oos_sync_records (
      user_id, table_name, local_id, payload, client_updated_at, deleted_at
    ) values (
      (select auth.uid()),
      v_table_name,
      v_local_id,
      v_item->'payload',
      (v_item->>'client_updated_at')::timestamptz,
      (v_item->>'deleted_at')::timestamptz
    )
    on conflict (user_id, table_name, local_id) do update set
      payload = excluded.payload,
      client_updated_at = excluded.client_updated_at,
      deleted_at = excluded.deleted_at
    where public.oos_sync_records.client_updated_at <= excluded.client_updated_at;

    get diagnostics v_affected = row_count;
    return query select v_table_name, v_local_id, v_affected > 0;
  end loop;
end;
$$;

revoke all on function public.apply_oos_sync_records(jsonb) from public, anon;
grant execute on function public.apply_oos_sync_records(jsonb) to authenticated;
