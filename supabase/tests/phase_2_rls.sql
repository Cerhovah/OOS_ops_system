begin;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'phase_2_rls_requires_an_authenticated_fixture_user';
  end if;

  perform set_config('app.phase_2_rls_user_id', v_user_id::text, true);
  insert into public.oos_sync_records (
    user_id, table_name, local_id, payload, client_updated_at, deleted_at
  ) values (
    v_user_id,
    'settings',
    'item_notification:phase_2_rls_fixture',
    '{"key":"item_notification:phase_2_rls_fixture","value":"fixture","updated_at":"2026-09-04T00:00:00.000Z"}'::jsonb,
    '2026-09-04T00:00:00.000Z'::timestamptz,
    null
  )
  on conflict on constraint oos_sync_records_pkey do update set
    payload = excluded.payload,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at;

  if has_table_privilege('authenticated', 'public.oos_sync_records', 'INSERT')
    or has_table_privilege('authenticated', 'public.oos_sync_records', 'UPDATE')
    or has_table_privilege('authenticated', 'public.oos_sync_records', 'DELETE') then
    raise exception 'phase_2_authenticated_role_has_direct_write_privilege';
  end if;
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
  v_applied_rows bigint;
  v_now timestamptz := clock_timestamp();
begin
  select count(*) into v_visible_rows
    from public.oos_sync_records
   where local_id = 'item_notification:phase_2_rls_fixture';
  if v_visible_rows <> 1 then
    raise exception 'phase_2_rls_owner_cannot_select_fixture';
  end if;

  select count(*) into v_applied_rows
    from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'item_notification:phase_2_rpc_fixture',
      'payload', jsonb_build_object(
        'key', 'item_notification:phase_2_rpc_fixture',
        'value', 'fixture',
        'updated_at', v_now
      ),
      'client_updated_at', v_now,
      'deleted_at', null
    )))
   where applied;
  if v_applied_rows <> 1 then
    raise exception 'phase_2_rpc_owner_cannot_apply_fixture';
  end if;

  begin
    update public.oos_sync_records
       set payload = payload
     where local_id = 'item_notification:phase_2_rls_fixture';
    raise exception 'phase_2_owner_has_direct_update_privilege';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform * from public.apply_oos_sync_records('[]'::jsonb);
    raise exception 'phase_2_rpc_accepts_empty_array';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'p_records must contain between 1 and 250 records' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records((
      select jsonb_agg(jsonb_build_object(
        'table_name', 'settings',
        'local_id', '__phase_2_count_fixture__' || value,
        'payload', jsonb_build_object(
          'key', '__phase_2_count_fixture__' || value,
          'value', 'fixture',
          'updated_at', clock_timestamp()
        ),
        'client_updated_at', clock_timestamp(),
        'deleted_at', null
      )) from generate_series(1, 251) as value
    ));
    raise exception 'phase_2_rpc_accepts_more_than_250_records';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'p_records must contain between 1 and 250 records' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'not_allowed',
      'local_id', 'probe',
      'payload', '{"id":"probe"}'::jsonb,
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_unknown_table';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'unsupported sync table: not_allowed' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'item_notification:phase_2_invalid_time_fixture',
      'payload', jsonb_build_object(
        'key', 'item_notification:phase_2_invalid_time_fixture',
        'value', 'fixture',
        'updated_at', 'not-a-date'
      ),
      'client_updated_at', 'not-a-date',
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_invalid_timestamp';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'invalid client_updated_at' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'future_setting',
      'payload', jsonb_build_object(
        'key', 'future_setting',
        'value', 'fixture',
        'updated_at', clock_timestamp()
      ),
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_unknown_setting';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'unsupported sync setting: future_setting' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'itemXnotification:not_a_prefix',
      'payload', jsonb_build_object(
        'key', 'itemXnotification:not_a_prefix',
        'value', 'fixture',
        'updated_at', v_now
      ),
      'client_updated_at', v_now,
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_treats_underscore_as_prefix_wildcard';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'unsupported sync setting: itemXnotification:not_a_prefix' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'analysis_range_weeks',
      'payload', jsonb_build_object(
        'key', 'analysis_range_weeks',
        'value', 'fixture',
        'updated_at', clock_timestamp() - interval '1 minute'
      ),
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_timestamp_mismatch';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'payload updated_at does not match client_updated_at' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', repeat('x', 257),
      'payload', jsonb_build_object('key', repeat('x', 257), 'value', 'fixture', 'updated_at', clock_timestamp()),
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_long_local_id';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'invalid sync local_id' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'item_notification:phase_2_large_fixture',
      'payload', jsonb_build_object(
        'key', 'item_notification:phase_2_large_fixture',
        'value', repeat('x', 256 * 1024),
        'updated_at', clock_timestamp()
      ),
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_oversized_payload';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'sync record payload is too large' then raise; end if;
  end;

  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', 'item_notification:phase_2_future_fixture',
      'payload', jsonb_build_object(
        'key', 'item_notification:phase_2_future_fixture',
        'value', 'fixture',
        'updated_at', clock_timestamp() + interval '6 minutes'
      ),
      'client_updated_at', clock_timestamp() + interval '6 minutes',
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_accepts_future_timestamp';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'client_updated_at is too far in the future' then raise; end if;
  end;
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
begin
  if exists (
    select 1 from public.oos_sync_records
     where user_id = current_setting('app.phase_2_rls_user_id')::uuid
  ) then
    raise exception 'phase_2_rls_other_user_can_select_owner_rows';
  end if;

  begin
    delete from public.oos_sync_records
     where user_id = current_setting('app.phase_2_rls_user_id')::uuid;
    raise exception 'phase_2_authenticated_role_has_direct_delete_privilege';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  begin
    perform * from public.apply_oos_sync_records(jsonb_build_array(jsonb_build_object(
      'table_name', 'settings',
      'local_id', '__phase_2_anon_fixture__',
      'payload', jsonb_build_object('key', '__phase_2_anon_fixture__', 'value', 'fixture', 'updated_at', clock_timestamp()),
      'client_updated_at', clock_timestamp(),
      'deleted_at', null
    )));
    raise exception 'phase_2_rpc_allows_anon_execute';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;

select 'phase_2_rls_passed' as result;
