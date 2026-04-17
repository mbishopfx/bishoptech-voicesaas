do $$
begin
  if not exists (select 1 from pg_type where typname = 'demo_session_status_type') then
    create type public.demo_session_status_type as enum ('draft', 'queued', 'completed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'reservation_status_type') then
    create type public.reservation_status_type as enum ('free', 'reserved', 'assigned', 'cooldown');
  end if;
end $$;

create table if not exists public.icp_template_packs (
  id text primary key,
  slug text not null unique,
  label text not null,
  vertical text not null,
  summary text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  version_label text not null,
  status text not null default 'draft',
  summary text,
  changed_by text,
  changed_at timestamptz not null default now()
);

create table if not exists public.managed_number_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  phone_number text not null,
  label text not null,
  status public.reservation_status_type not null default 'free',
  assigned_to text,
  reservation_ends_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  assistant_id uuid references public.agents(id) on delete set null,
  assistant_version_id uuid references public.assistant_versions(id) on delete set null,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  target_phone_number text not null,
  assigned_number_label text not null,
  scenario_label text not null,
  status public.demo_session_status_type not null default 'draft',
  resulting_call_id uuid references public.calls(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_capture_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  lead_id uuid references public.contacts(id) on delete set null,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  source text not null,
  status text not null,
  confidence numeric(5,4) not null default 0,
  missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_recovery_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  lead_id uuid references public.contacts(id) on delete set null,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  provider text not null,
  status text not null,
  confidence numeric(5,4) not null default 0,
  missing_fields jsonb not null default '[]'::jsonb,
  extracted_lead jsonb not null default '{}'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  lead_id uuid references public.contacts(id) on delete cascade,
  provider text not null,
  status text not null,
  summary text,
  enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.call_qa_grades (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.calls(id) on delete cascade,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  overall_score numeric(5,2) not null default 0,
  score_label text not null,
  rubric_scores jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_playground_scenarios (
  id text primary key,
  icp_pack_id text references public.icp_template_packs(id) on delete cascade,
  label text not null,
  description text not null,
  default_prompt text not null,
  expected_signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_versions_agent_changed on public.assistant_versions(agent_id, changed_at desc);
create index if not exists idx_managed_number_reservations_org on public.managed_number_reservations(organization_id, created_at desc);
create index if not exists idx_demo_sessions_org_created on public.demo_sessions(organization_id, created_at desc);
create index if not exists idx_lead_capture_attempts_org_created on public.lead_capture_attempts(organization_id, created_at desc);
create index if not exists idx_lead_recovery_runs_org_created on public.lead_recovery_runs(organization_id, created_at desc);
create index if not exists idx_lead_enrichment_runs_org_created on public.lead_enrichment_runs(organization_id, created_at desc);
create index if not exists idx_call_qa_grades_call_created on public.call_qa_grades(call_id, created_at desc);

alter table public.icp_template_packs enable row level security;
alter table public.assistant_versions enable row level security;
alter table public.managed_number_reservations enable row level security;
alter table public.demo_sessions enable row level security;
alter table public.lead_capture_attempts enable row level security;
alter table public.lead_recovery_runs enable row level security;
alter table public.lead_enrichment_runs enable row level security;
alter table public.call_qa_grades enable row level security;
alter table public.client_playground_scenarios enable row level security;

drop policy if exists assistant_versions_select_scope on public.assistant_versions;
create policy assistant_versions_select_scope on public.assistant_versions
for select using (public.is_member_of_org(organization_id));

drop policy if exists managed_number_reservations_select_scope on public.managed_number_reservations;
create policy managed_number_reservations_select_scope on public.managed_number_reservations
for select using (public.is_member_of_org(organization_id));

drop policy if exists demo_sessions_select_scope on public.demo_sessions;
create policy demo_sessions_select_scope on public.demo_sessions
for select using (public.is_member_of_org(organization_id));

drop policy if exists lead_capture_attempts_select_scope on public.lead_capture_attempts;
create policy lead_capture_attempts_select_scope on public.lead_capture_attempts
for select using (public.is_member_of_org(organization_id));

drop policy if exists lead_recovery_runs_select_scope on public.lead_recovery_runs;
create policy lead_recovery_runs_select_scope on public.lead_recovery_runs
for select using (public.is_member_of_org(organization_id));

drop policy if exists lead_enrichment_runs_select_scope on public.lead_enrichment_runs;
create policy lead_enrichment_runs_select_scope on public.lead_enrichment_runs
for select using (public.is_member_of_org(organization_id));

drop policy if exists call_qa_grades_select_scope on public.call_qa_grades;
create policy call_qa_grades_select_scope on public.call_qa_grades
for select using (
  call_id in (
    select id
    from public.calls
    where public.is_member_of_org(organization_id)
  )
);

drop policy if exists client_playground_scenarios_select_scope on public.client_playground_scenarios;
create policy client_playground_scenarios_select_scope on public.client_playground_scenarios
for select using (true);
