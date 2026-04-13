-- Vapi control plane support: org credentials, versioned assistant snapshots, and sync metadata.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vapi_account_mode_type') then
    create type public.vapi_account_mode_type as enum ('managed', 'byo');
  end if;
end $$;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'vapi',
  label text not null default 'Primary Vapi key',
  secret_value text not null,
  secret_type text not null default 'api_key',
  is_default boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_api_keys_org_provider on public.api_keys(organization_id, provider);
create unique index if not exists idx_api_keys_org_provider_default on public.api_keys(organization_id, provider) where is_default;

alter table public.api_keys enable row level security;
drop policy if exists api_keys_select_scope on public.api_keys;
drop policy if exists api_keys_write_scope on public.api_keys;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'trg_api_keys_updated_at') then
    create trigger trg_api_keys_updated_at
    before update on public.api_keys
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.organizations
  add column if not exists vapi_account_mode public.vapi_account_mode_type not null default 'managed',
  add column if not exists vapi_api_key_id uuid,
  add column if not exists vapi_managed_label text default 'Managed Vapi';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_vapi_api_key_id_fkey'
  ) then
    alter table public.organizations
      add constraint organizations_vapi_api_key_id_fkey
      foreign key (vapi_api_key_id) references public.api_keys(id) on delete set null;
  end if;
end $$;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  agent_type public.agent_type not null default 'inbound',
  vapi_assistant_id text unique,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  vapi_sync_status text not null default 'unknown',
  vapi_last_error text,
  vapi_last_synced_at timestamptz,
  vapi_last_published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents
  add column if not exists vapi_sync_status text not null default 'unknown',
  add column if not exists vapi_last_error text,
  add column if not exists vapi_last_synced_at timestamptz,
  add column if not exists vapi_last_published_at timestamptz,
  add column if not exists vapi_draft_config jsonb not null default '{}'::jsonb,
  add column if not exists vapi_live_config jsonb not null default '{}'::jsonb;

create index if not exists idx_agents_organization on public.agents(organization_id);
create index if not exists idx_agents_organization_type on public.agents(organization_id, agent_type);

alter table public.agents enable row level security;
drop policy if exists agents_select_scope on public.agents;
drop policy if exists agents_write_scope on public.agents;
create policy agents_select_scope on public.agents
for select using (public.is_member_of_org(organization_id));
create policy agents_write_scope on public.agents
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

create table if not exists public.agent_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  action text not null check (action in ('draft_saved', 'published', 'synced', 'reverted')),
  version integer not null default 1,
  draft_payload jsonb not null default '{}'::jsonb,
  live_payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_revisions_agent_created on public.agent_revisions(agent_id, created_at desc);
create index if not exists idx_agent_revisions_org_created on public.agent_revisions(organization_id, created_at desc);

alter table public.agent_revisions enable row level security;
drop policy if exists agent_revisions_select_scope on public.agent_revisions;
drop policy if exists agent_revisions_write_scope on public.agent_revisions;
create policy agent_revisions_select_scope on public.agent_revisions
for select using (public.is_member_of_org(organization_id));
create policy agent_revisions_write_scope on public.agent_revisions
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));
