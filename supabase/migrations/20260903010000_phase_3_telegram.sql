create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.telegram_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allowed_chat_id bigint not null unique,
  bot_username text not null,
  notification_time time not null default '21:30:00',
  time_zone text not null default 'Asia/Seoul',
  enabled boolean not null default true,
  last_prompt_local_date date,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_updates (
  update_id bigint primary key,
  chat_id bigint,
  received_at timestamptz not null default now()
);

create table if not exists public.telegram_proposals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id bigint not null,
  source text not null check (source in ('text', 'voice')),
  original_text text not null,
  actions jsonb not null check (jsonb_typeof(actions) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists telegram_proposals_user_created_idx
  on public.telegram_proposals (user_id, created_at desc);

create table if not exists public.telegram_delivery_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  kind text not null check (kind in ('daily_close')),
  chat_id bigint not null,
  telegram_message_id bigint,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date, kind)
);

create or replace function public.touch_telegram_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_telegram_settings on public.telegram_settings;
create trigger touch_telegram_settings
before update on public.telegram_settings
for each row execute function public.touch_telegram_settings();

alter table public.telegram_settings enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.telegram_proposals enable row level security;
alter table public.telegram_delivery_log enable row level security;

revoke all on table public.telegram_settings from public, anon, authenticated;
revoke all on table public.telegram_updates from public, anon, authenticated;
revoke all on table public.telegram_proposals from public, anon, authenticated;
revoke all on table public.telegram_delivery_log from public, anon, authenticated;

grant select on table public.telegram_settings to authenticated;
grant update (notification_time, enabled) on table public.telegram_settings to authenticated;
grant select on table public.telegram_proposals to authenticated;

drop policy if exists "telegram settings select own" on public.telegram_settings;
create policy "telegram settings select own"
  on public.telegram_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "telegram settings update own" on public.telegram_settings;
create policy "telegram settings update own"
  on public.telegram_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "telegram proposals select own" on public.telegram_proposals;
create policy "telegram proposals select own"
  on public.telegram_proposals for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.telegram_settings is
  'Single-user Telegram connection metadata. Bot tokens and webhook secrets remain Edge Function secrets.';
comment on table public.telegram_updates is
  'Telegram update ids processed by the webhook for retry-safe idempotency.';
comment on table public.telegram_proposals is
  'Free-text and voice actions awaiting explicit Telegram confirmation.';
comment on table public.telegram_delivery_log is
  'Idempotency ledger for scheduled Telegram messages.';
