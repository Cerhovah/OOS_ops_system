do $$
declare
  v_records bigint := 0;
  v_mutations bigint := 0;
  v_conflicts bigint := 0;
begin
  if to_regclass('public.sync_records') is not null then
    select count(*) into v_records from public.sync_records;
  end if;
  if to_regclass('public.sync_mutations') is not null then
    select count(*) into v_mutations from public.sync_mutations;
  end if;
  if to_regclass('public.sync_conflicts') is not null then
    select count(*) into v_conflicts from public.sync_conflicts;
  end if;

  if v_records + v_mutations + v_conflicts <> 0 then
    raise exception 'legacy sync schema contains data; cleanup stopped';
  end if;
end;
$$;

drop function if exists public.apply_sync_mutation(
  uuid,
  text,
  text,
  text,
  jsonb,
  bigint,
  timestamptz,
  uuid
);
drop table if exists public.sync_conflicts;
drop table if exists public.sync_mutations;
drop table if exists public.sync_records;
drop sequence if exists public.sync_version_seq;
