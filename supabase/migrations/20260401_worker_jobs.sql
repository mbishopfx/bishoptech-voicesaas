do $$
begin
  if not exists (select 1 from pg_type where typname = 'worker_job_status') then
    create type public.worker_job_status as enum ('queued', 'processing', 'completed', 'failed');
  end if;
end $$;

create table if not exists public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  job_type text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  status public.worker_job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_event_ingests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null,
  event_type text not null,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_worker_jobs_claim
  on public.worker_jobs(queue_name, status, available_at, created_at);

create index if not exists idx_worker_jobs_org_created
  on public.worker_jobs(organization_id, created_at desc);

create unique index if not exists idx_worker_event_ingests_provider_external
  on public.worker_event_ingests(provider, external_id);

alter table public.worker_jobs enable row level security;
alter table public.worker_event_ingests enable row level security;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'trg_worker_jobs_updated_at') then
    create trigger trg_worker_jobs_updated_at
    before update on public.worker_jobs
    for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.claim_worker_jobs(target_queue text, worker_name text, batch_size integer default 10)
returns setof public.worker_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select w.id
    from public.worker_jobs w
    where w.queue_name = target_queue
      and w.status = 'queued'
      and w.available_at <= now()
      and w.attempts < w.max_attempts
    order by w.available_at asc, w.created_at asc
    for update skip locked
    limit greatest(batch_size, 1)
  ), claimed as (
    update public.worker_jobs w
    set status = 'processing',
        locked_at = now(),
        locked_by = worker_name,
        attempts = w.attempts + 1,
        updated_at = now()
    from candidates c
    where w.id = c.id
    returning w.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.claim_worker_jobs(text, text, integer) to service_role;
