-- Demo templates, client-facing assets, and workflow boards

create table if not exists demo_blueprints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  website_url text,
  google_business_profile_raw_text text,
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_template jsonb not null default '{}'::jsonb,
  mermaid_flowchart text,
  assigned_demo_phone_number_id text,
  vapi_assistant_id text,
  last_demo_call_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_boards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  mermaid_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  assistant_id uuid references assistants(id) on delete set null,
  call_event_id uuid references call_events(id) on delete set null,
  asset_type text not null check (asset_type in ('recording', 'transcript', 'lead', 'summary')),
  title text not null,
  asset_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_demo_blueprints_tenant_created on demo_blueprints(tenant_id, created_at desc);
create index if not exists idx_workflow_boards_tenant_created on workflow_boards(tenant_id, created_at desc);
create index if not exists idx_client_assets_tenant_created on client_assets(tenant_id, created_at desc);
create index if not exists idx_client_assets_client_created on client_assets(client_id, created_at desc);

alter table demo_blueprints enable row level security;
alter table workflow_boards enable row level security;
alter table client_assets enable row level security;

create policy demo_blueprints_select_tenant_scope on demo_blueprints
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

create policy workflow_boards_select_tenant_scope on workflow_boards
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

create policy client_assets_select_tenant_scope on client_assets
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);
