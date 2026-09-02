begin;

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
