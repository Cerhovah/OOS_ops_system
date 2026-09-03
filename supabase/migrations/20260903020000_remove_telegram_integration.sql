do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'oos-telegram-daily-dispatch'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

delete from vault.secrets where name = 'oos_telegram_cron_secret';

drop table if exists public.telegram_delivery_log;
drop table if exists public.telegram_proposals;
drop table if exists public.telegram_updates;
drop table if exists public.telegram_settings;
drop function if exists public.touch_telegram_settings();
