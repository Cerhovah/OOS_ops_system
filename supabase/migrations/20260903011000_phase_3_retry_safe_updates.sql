alter table public.telegram_updates
  add column if not exists status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  add column if not exists attempted_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists last_error text;

comment on column public.telegram_updates.status is
  'Webhook lifecycle state. Failed updates may be claimed again when Telegram retries.';
