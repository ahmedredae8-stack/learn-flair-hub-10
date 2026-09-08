create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.job_secrets (
  name text primary key,
  token text not null,
  created_at timestamptz not null default now()
);
alter table public.job_secrets enable row level security;
revoke all on public.job_secrets from anon, authenticated;
grant all on public.job_secrets to service_role;

insert into public.job_secrets (name, token)
values ('ai_jobs_tick', encode(gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

select cron.unschedule('ai-jobs-tick') where exists (select 1 from cron.job where jobname = 'ai-jobs-tick');

select cron.schedule(
  'ai-jobs-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://project--6abdc85b-3893-4c53-94a7-53fc855022c4.lovable.app/api/public/ai-jobs-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-job-token', (select token from public.job_secrets where name = 'ai_jobs_tick')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);