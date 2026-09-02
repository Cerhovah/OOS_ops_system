begin;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'phase_3_rls_requires_one_auth_user';
  end if;

  perform set_config('app.phase_3_rls_user_id', v_user_id::text, true);

  insert into public.telegram_settings (
    user_id,
    allowed_chat_id,
    bot_username,
    notification_time,
    time_zone,
    enabled
  ) values (
    v_user_id,
    -900000000000000000,
    'phase_3_rls_probe_bot',
    '21:30',
    'Asia/Seoul',
    true
  )
  on conflict (user_id) do update
    set notification_time = excluded.notification_time,
        enabled = excluded.enabled;

  insert into public.telegram_proposals (
    id,
    user_id,
    chat_id,
    source,
    original_text,
    actions
  ) values (
    '00000000-0000-4000-8000-000000000003',
    v_user_id,
    -900000000000000000,
    'text',
    'rls probe',
    '[]'::jsonb
  )
  on conflict (id) do nothing;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.phase_3_rls_user_id'),
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  v_settings bigint;
  v_proposals bigint;
  v_affected bigint;
begin
  select count(*) into v_settings from public.telegram_settings;
  if v_settings <> 1 then
    raise exception 'phase_3_rls_owner_settings_visibility_failed';
  end if;

  select count(*) into v_proposals from public.telegram_proposals;
  if v_proposals < 1 then
    raise exception 'phase_3_rls_owner_proposal_visibility_failed';
  end if;

  update public.telegram_settings
     set notification_time = '20:45', enabled = false
   where user_id = (select auth.uid());
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'phase_3_rls_owner_allowed_update_failed';
  end if;

  begin
    update public.telegram_settings
       set allowed_chat_id = allowed_chat_id
     where user_id = (select auth.uid());
    raise exception 'phase_3_rls_owner_can_update_protected_chat_id';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.telegram_proposals (
      id, user_id, chat_id, source, original_text, actions
    ) values (
      '00000000-0000-4000-8000-000000000004',
      (select auth.uid()),
      -900000000000000000,
      'text',
      'forbidden insert probe',
      '[]'::jsonb
    );
    raise exception 'phase_3_rls_owner_can_insert_server_proposal';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_affected bigint;
begin
  if exists (select 1 from public.telegram_settings) then
    raise exception 'phase_3_rls_other_user_can_select_settings';
  end if;

  if exists (select 1 from public.telegram_proposals) then
    raise exception 'phase_3_rls_other_user_can_select_proposals';
  end if;

  update public.telegram_settings
     set enabled = false
   where user_id = current_setting('app.phase_3_rls_user_id')::uuid;
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then
    raise exception 'phase_3_rls_other_user_can_update_settings';
  end if;
end;
$$;

reset role;
rollback;

select 'phase_3_telegram_rls_passed' as result;
