alter table public.demo_blueprints
  add column if not exists local_agent_id uuid,
  add column if not exists status text not null default 'draft' check (status in ('draft', 'building', 'kb_ready', 'assistant_ready', 'test_called', 'failed')),
  add column if not exists pack_dir text,
  add column if not exists knowledge_pack_slug text,
  add column if not exists query_tool_id text,
  add column if not exists vapi_assistant_id text,
  add column if not exists kb_sync_status text not null default 'pending' check (kb_sync_status in ('pending', 'building', 'synced', 'failed')),
  add column if not exists kb_sync_error text,
  add column if not exists source_inputs jsonb not null default '{}'::jsonb,
  add column if not exists embed_snippet text,
  add column if not exists last_test_call_id text,
  add column if not exists last_test_call_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'demo_blueprints_local_agent_id_fkey'
  ) then
    alter table public.demo_blueprints
      add constraint demo_blueprints_local_agent_id_fkey
      foreign key (local_agent_id) references public.agents(id) on delete set null;
  end if;
end $$;

create table if not exists public.demo_blueprint_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  demo_blueprint_id uuid not null references public.demo_blueprints(id) on delete cascade,
  asset_type text not null check (asset_type in ('website-page', 'google-business-profile', 'operator-file', 'goal-notes', 'generated-pack')),
  source_label text not null,
  source_url text,
  file_name text,
  file_ext text,
  mime_type text,
  storage_path text,
  byte_size bigint,
  vapi_file_id text,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'uploaded', 'synced', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_demo_blueprints_status_updated on public.demo_blueprints(status, updated_at desc);
create index if not exists idx_demo_blueprints_vapi_assistant on public.demo_blueprints(vapi_assistant_id);
create index if not exists idx_demo_blueprints_local_agent on public.demo_blueprints(local_agent_id);
create index if not exists idx_demo_blueprints_pack_slug on public.demo_blueprints(knowledge_pack_slug);
create index if not exists idx_demo_blueprint_assets_blueprint_created on public.demo_blueprint_assets(demo_blueprint_id, created_at desc);
create index if not exists idx_demo_blueprint_assets_org_created on public.demo_blueprint_assets(organization_id, created_at desc);

alter table public.demo_blueprint_assets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_demo_blueprint_assets_updated_at'
  ) then
    create trigger trg_demo_blueprint_assets_updated_at
    before update on public.demo_blueprint_assets
    for each row execute function public.set_updated_at();
  end if;
end $$;

drop policy if exists demo_blueprints_select_scope on public.demo_blueprints;
create policy demo_blueprints_select_scope on public.demo_blueprints
for select using (
  public.is_platform_admin()
  or public.is_member_of_org(organization_id)
);

drop policy if exists demo_blueprints_write_scope on public.demo_blueprints;
create policy demo_blueprints_write_scope on public.demo_blueprints
for all using (
  public.is_platform_admin()
  or public.can_manage_org(organization_id)
)
with check (
  public.is_platform_admin()
  or public.can_manage_org(organization_id)
);

drop policy if exists demo_blueprint_assets_select_scope on public.demo_blueprint_assets;
create policy demo_blueprint_assets_select_scope on public.demo_blueprint_assets
for select using (
  public.is_platform_admin()
  or public.is_member_of_org(organization_id)
);

drop policy if exists demo_blueprint_assets_write_scope on public.demo_blueprint_assets;
create policy demo_blueprint_assets_write_scope on public.demo_blueprint_assets
for all using (
  public.is_platform_admin()
  or public.can_manage_org(organization_id)
)
with check (
  public.is_platform_admin()
  or public.can_manage_org(organization_id)
);
