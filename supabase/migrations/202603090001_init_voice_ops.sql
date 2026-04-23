-- VoiceOps organization-scoped baseline schema

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'admin', 'manager', 'agent', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'organization_role') then
    create type public.organization_role as enum ('owner', 'admin', 'manager', 'agent', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'agent_type') then
    create type public.agent_type as enum ('inbound', 'outbound');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Chicago',
  plan_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  default_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  phone_e164 text,
  email text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  call_status text not null default 'completed',
  from_number text,
  to_number text,
  duration_seconds integer,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone_e164 text,
  friendly_name text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voicemail_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assistant_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
  vapi_draft_config jsonb not null default '{}'::jsonb,
  vapi_live_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calls
  add column if not exists updated_at timestamptz not null default now();

alter table public.phone_numbers
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.voicemail_assets
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.api_keys
  add column if not exists provider text not null default 'vapi',
  add column if not exists label text not null default 'Primary Vapi key',
  add column if not exists secret_value text not null default '',
  add column if not exists secret_type text not null default 'api_key',
  add column if not exists is_default boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.agents
  add column if not exists vapi_sync_status text not null default 'unknown',
  add column if not exists vapi_last_error text,
  add column if not exists vapi_last_synced_at timestamptz,
  add column if not exists vapi_last_published_at timestamptz,
  add column if not exists vapi_draft_config jsonb not null default '{}'::jsonb,
  add column if not exists vapi_live_config jsonb not null default '{}'::jsonb;

create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_organization_members_org on public.organization_members(organization_id);
create index if not exists idx_campaigns_org_created on public.campaigns(organization_id, created_at desc);
create index if not exists idx_contacts_org_updated on public.contacts(organization_id, updated_at desc);
create index if not exists idx_calls_org_created on public.calls(organization_id, created_at desc);
create index if not exists idx_phone_numbers_org on public.phone_numbers(organization_id, created_at desc);
create index if not exists idx_voicemail_assets_org on public.voicemail_assets(organization_id, created_at desc);
create index if not exists idx_usage_events_org on public.usage_events(organization_id, created_at desc);
create index if not exists idx_call_events_org on public.call_events(organization_id, created_at desc);
create index if not exists idx_api_keys_org_provider on public.api_keys(organization_id, provider);
create unique index if not exists idx_api_keys_org_provider_default on public.api_keys(organization_id, provider) where is_default;
create index if not exists idx_agents_org on public.agents(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.contacts enable row level security;
alter table public.calls enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.voicemail_assets enable row level security;
alter table public.usage_events enable row level security;
alter table public.call_events enable row level security;
alter table public.api_keys enable row level security;
alter table public.agents enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_organizations_updated_at') then
    create trigger trg_organizations_updated_at
    before update on public.organizations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_user_profiles_updated_at') then
    create trigger trg_user_profiles_updated_at
    before update on public.user_profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_campaigns_updated_at') then
    create trigger trg_campaigns_updated_at
    before update on public.campaigns
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_contacts_updated_at') then
    create trigger trg_contacts_updated_at
    before update on public.contacts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_calls_updated_at') then
    create trigger trg_calls_updated_at
    before update on public.calls
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_phone_numbers_updated_at') then
    create trigger trg_phone_numbers_updated_at
    before update on public.phone_numbers
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_voicemail_assets_updated_at') then
    create trigger trg_voicemail_assets_updated_at
    before update on public.voicemail_assets
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_api_keys_updated_at') then
    create trigger trg_api_keys_updated_at
    before update on public.api_keys
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_agents_updated_at') then
    create trigger trg_agents_updated_at
    before update on public.agents
    for each row execute function public.set_updated_at();
  end if;
end $$;
