begin;

revoke insert, update, delete on table public.oos_sync_records from authenticated;

create or replace function public.apply_oos_sync_records(p_records jsonb)
returns table(table_name text, local_id text, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item jsonb;
  v_payload jsonb;
  v_affected integer;
  v_record_count integer;
  v_table_name text;
  v_local_id text;
  v_client_updated_at timestamptz;
  v_deleted_at timestamptz;
  v_payload_updated_at timestamptz;
  v_payload_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'p_records must be a JSON array' using errcode = '22023';
  end if;

  v_record_count := jsonb_array_length(p_records);
  if v_record_count < 1 or v_record_count > 250 then
    raise exception 'p_records must contain between 1 and 250 records' using errcode = '22023';
  end if;
  if octet_length(p_records::text) > 8 * 1024 * 1024 then
    raise exception 'p_records payload is too large' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_records)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid sync record' using errcode = '22023';
    end if;

    v_table_name := v_item->>'table_name';
    v_local_id := v_item->>'local_id';
    v_payload := v_item->'payload';
    if v_table_name is null or char_length(v_table_name) < 1 or char_length(v_table_name) > 64 then
      raise exception 'invalid sync table name' using errcode = '22023';
    end if;
    if v_table_name <> all (array[
      'accounts','projects','items','item_schedules','project_kpis','project_kpi_records',
      'weekly_plans','weekly_plan_lines','entries','day_notes','day_closures','weekly_comments',
      'today_item_additions','analysis_sessions','ai_proposals','settings'
    ]) then
      raise exception 'unsupported sync table: %', v_table_name using errcode = '22023';
    end if;
    if v_local_id is null or char_length(v_local_id) < 1 or char_length(v_local_id) > 256 then
      raise exception 'invalid sync local_id' using errcode = '22023';
    end if;
    if jsonb_typeof(v_payload) <> 'object' then
      raise exception 'sync payload must be an object' using errcode = '22023';
    end if;
    if octet_length(v_payload::text) > 256 * 1024 then
      raise exception 'sync record payload is too large' using errcode = '22023';
    end if;
    if v_table_name = 'settings' and v_payload->>'key' is distinct from v_local_id then
      raise exception 'settings key does not match local_id' using errcode = '22023';
    end if;
    if v_table_name = 'settings'
      and not (
        v_local_id = any (array[
          'week_start_day','day_end_time','close_notification_time','close_notification_enabled',
          'notification_always','timer_limit_notifications_enabled','time_zone','ai_provider',
          'ai_model','analysis_range_weeks','analysis_include_notes'
        ])
        or left(v_local_id, char_length('item_notification:')) = 'item_notification:'
      ) then
      raise exception 'unsupported sync setting: %', v_local_id using errcode = '22023';
    end if;
    if v_table_name <> 'settings' and v_payload->>'id' is distinct from v_local_id then
      raise exception 'payload id does not match local_id' using errcode = '22023';
    end if;
    if not (v_item ? 'deleted_at') then
      raise exception 'sync record must include deleted_at' using errcode = '22023';
    end if;

    begin
      v_client_updated_at := (v_item->>'client_updated_at')::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'invalid client_updated_at' using errcode = '22023';
    end;
    if v_client_updated_at is null or not isfinite(v_client_updated_at) then
      raise exception 'invalid client_updated_at' using errcode = '22023';
    end if;
    if v_client_updated_at > clock_timestamp() + interval '5 minutes' then
      raise exception 'client_updated_at is too far in the future' using errcode = '22023';
    end if;
    begin
      v_payload_updated_at := (v_payload->>'updated_at')::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'invalid payload updated_at' using errcode = '22023';
    end;
    if v_payload_updated_at is null
      or not isfinite(v_payload_updated_at)
      or v_payload_updated_at is distinct from v_client_updated_at then
      raise exception 'payload updated_at does not match client_updated_at' using errcode = '22023';
    end if;

    begin
      v_deleted_at := (v_item->>'deleted_at')::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'invalid deleted_at' using errcode = '22023';
    end;
    if v_deleted_at is not null and not isfinite(v_deleted_at) then
      raise exception 'invalid deleted_at' using errcode = '22023';
    end if;
    if v_table_name <> 'settings' then
      if not (v_payload ? 'deleted_at') then
        raise exception 'sync payload must include deleted_at' using errcode = '22023';
      end if;
      begin
        v_payload_deleted_at := (v_payload->>'deleted_at')::timestamptz;
      exception
        when invalid_datetime_format or datetime_field_overflow then
          raise exception 'invalid payload deleted_at' using errcode = '22023';
      end;
      if v_payload_deleted_at is distinct from v_deleted_at then
        raise exception 'payload deleted_at does not match deleted_at' using errcode = '22023';
      end if;
    end if;

    insert into public.oos_sync_records (
      user_id, table_name, local_id, payload, client_updated_at, deleted_at
    ) values (
      v_user_id,
      v_table_name,
      v_local_id,
      v_payload,
      v_client_updated_at,
      v_deleted_at
    )
    on conflict on constraint oos_sync_records_pkey do update set
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

commit;
