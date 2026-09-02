begin;
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

  select sm.* into v_existing
  from public.sync_mutations as sm
  where sm.user_id = v_user_id and sm.mutation_id = p_mutation_id;
  v_existing_mutation := found;

  if v_existing_mutation then
    return query
      select v_existing.table_name, v_existing.row_id, v_existing.payload, v_existing.is_deleted,
             v_existing.applied_version, v_existing.applied_at, v_existing.mutation_id, v_existing.device_id;
    return;
  end if;

  select sr.* into v_current
  from public.sync_records as sr
  where sr.user_id = v_user_id and sr.table_name = p_table_name and sr.row_id = p_row_id
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
