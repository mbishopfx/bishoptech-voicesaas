-- Vapi Voice Ops SaaS - Initial schema
-- Multi-tenant admin/client dashboard with Vapi assistant lifecycle + analytics

create extension if not exists pgcrypto;

create type app_role as enum ('platform_admin', 'tenant_admin', 'tenant_member', 'client_readonly');
create type assistant_status as enum ('draft', 'active', 'paused', 'archived', 'error');
create type call_outcome as enum ('booked', 'qualified', 'unqualified', 'no_answer', 'voicemail', 'escalated', 'failed');
create type channel_type as enum ('phone', 'web', 'sms');

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  business_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  support_tier text default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  vertical text,
  system_prompt text not null,
  default_first_message text,
  default_tools jsonb not null default '[]'::jsonb,
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists voice_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  provider text not null,
  provider_voice_id text not null,
  style_notes text,
  default_speed numeric(4,2) default 1.00,
  default_stability numeric(4,2),
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assistants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  status assistant_status not null default 'draft',
  vapi_assistant_id text unique,
  system_prompt text not null,
  first_message text,
  model_config jsonb not null default '{}'::jsonb,
  tools_config jsonb not null default '[]'::jsonb,
  booking_config jsonb not null default '{}'::jsonb,
  escalation_config jsonb not null default '{}'::jsonb,
  voice_profile_id uuid references voice_profiles(id) on delete set null,
  prompt_template_id uuid references prompt_templates(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assistant_channels (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references assistants(id) on delete cascade,
  channel channel_type not null,
  external_id text,
  phone_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(assistant_id, channel, coalesce(external_id, ''))
);

create table if not exists call_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  assistant_id uuid references assistants(id) on delete set null,
  vapi_call_id text,
  caller_number text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  outcome call_outcome,
  summary text,
  transcript jsonb,
  extracted_entities jsonb not null default '{}'::jsonb,
  recording_url text,
  cost_usd numeric(10,4),
  created_at timestamptz not null default now(),
  unique(vapi_call_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  call_event_id uuid references call_events(id) on delete set null,
  assistant_id uuid references assistants(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  service_requested text,
  booking_time timestamptz,
  booking_status text default 'new',
  source text default 'voice',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  visibility text not null default 'admin' check (visibility in ('admin','client','both')),
  title text not null,
  source_url text,
  content_markdown text,
  embedding_status text default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  scope text not null check (scope in ('admin','client')),
  created_at timestamptz not null default now()
);

create table if not exists ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_user on memberships(user_id);
create index if not exists idx_memberships_tenant on memberships(tenant_id);
create index if not exists idx_assistants_tenant on assistants(tenant_id);
create index if not exists idx_call_events_tenant_created on call_events(tenant_id, created_at desc);
create index if not exists idx_bookings_tenant_created on bookings(tenant_id, created_at desc);
create index if not exists idx_audit_logs_tenant_created on audit_logs(tenant_id, created_at desc);

-- RLS baseline
alter table tenants enable row level security;
alter table memberships enable row level security;
alter table clients enable row level security;
alter table assistants enable row level security;
alter table call_events enable row level security;
alter table bookings enable row level security;
alter table prompt_templates enable row level security;
alter table voice_profiles enable row level security;
alter table knowledge_sources enable row level security;
alter table ai_chat_sessions enable row level security;
alter table ai_chat_messages enable row level security;
alter table audit_logs enable row level security;

-- Example tenant isolation policy (apply/adapt per table)
create policy memberships_select_own on memberships
for select using (user_id = auth.uid());

-- NOTE: Add full per-role policies in next migration before production launch.
