begin;

do $$
declare
  v_user_id uuid;
begin
  select user_id
    into v_user_id
    from public.oos_sync_records
    limit 1;

  if v_user_id is null then
    raise exception 'phase_2_rls_requires_at_least_one_synced_record';
  end if;

  perform set_config('app.phase_2_rls_user_id', v_user_id::text, true);
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.phase_2_rls_user_id'),
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  v_visible_rows bigint;
begin
  select count(*) into v_visible_rows from public.oos_sync_records;

  if v_visible_rows = 0 then
    raise exception 'phase_2_rls_owner_cannot_select_own_rows';
  end if;

  if exists (
    select 1
      from public.oos_sync_records
     where user_id <> (select auth.uid())
  ) then
    raise exception 'phase_2_rls_owner_can_select_other_rows';
  end if;
end;
$$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_affected_rows bigint;
begin
  if exists (select 1 from public.oos_sync_records) then
    raise exception 'phase_2_rls_other_user_can_select_owner_rows';
  end if;

  update public.oos_sync_records
     set payload = payload
   where user_id = current_setting('app.phase_2_rls_user_id')::uuid;
  get diagnostics v_affected_rows = row_count;
  if v_affected_rows <> 0 then
    raise exception 'phase_2_rls_other_user_can_update_owner_rows';
  end if;

  delete from public.oos_sync_records
   where user_id = current_setting('app.phase_2_rls_user_id')::uuid;
  get diagnostics v_affected_rows = row_count;
  if v_affected_rows <> 0 then
    raise exception 'phase_2_rls_other_user_can_delete_owner_rows';
  end if;

  begin
    insert into public.oos_sync_records (
      user_id,
      table_name,
      local_id,
      payload,
      client_updated_at
    ) values (
      current_setting('app.phase_2_rls_user_id')::uuid,
      'settings',
      '__phase_2_rls_probe__',
      '{}'::jsonb,
      now()
    );

    raise exception 'phase_2_rls_other_user_can_insert_owner_row';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;

select 'phase_2_rls_passed' as result;
