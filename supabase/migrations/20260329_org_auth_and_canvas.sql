create extension if not exists pgcrypto;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self on public.platform_admins
for select using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

create or replace function public.is_member_of_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = org_id
        and om.user_id = auth.uid()
    );
$$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = org_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'manager')
    );
$$;

grant execute on function public.is_platform_admin() to anon, authenticated, service_role;
grant execute on function public.is_member_of_org(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_org(uuid) to anon, authenticated, service_role;

alter type public.agent_type add value if not exists 'specialist';

create table if not exists public.demo_blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  website_url text,
  google_business_profile_raw_text text,
  generated_template jsonb not null default '{}'::jsonb,
  mermaid_flowchart text,
  target_phone_number text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_boards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_name text,
  phone_number text not null,
  row_number integer not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create index if not exists idx_demo_blueprints_org_created on public.demo_blueprints(organization_id, created_at desc);
create index if not exists idx_workflow_boards_org_updated on public.workflow_boards(organization_id, updated_at desc);
create index if not exists idx_campaign_recipients_campaign on public.campaign_recipients(campaign_id);

alter table public.demo_blueprints enable row level security;
alter table public.workflow_boards enable row level security;
alter table public.campaign_recipients enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_demo_blueprints_updated_at'
  ) then
    create trigger trg_demo_blueprints_updated_at
    before update on public.demo_blueprints
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_workflow_boards_updated_at'
  ) then
    create trigger trg_workflow_boards_updated_at
    before update on public.workflow_boards
    for each row execute function public.set_updated_at();
  end if;
end $$;

drop policy if exists "org members can view org" on public.organizations;
create policy organizations_select_scope on public.organizations
for select using (public.is_member_of_org(id));
create policy organizations_write_scope on public.organizations
for all using (public.can_manage_org(id))
with check (public.can_manage_org(id));

drop policy if exists "member rows visible to org members" on public.organization_members;
create policy organization_members_select_scope on public.organization_members
for select using (public.is_member_of_org(organization_id));
create policy organization_members_write_scope on public.organization_members
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "users can read own profile" on public.user_profiles;
drop policy if exists "users can update own profile" on public.user_profiles;
create policy user_profiles_select_scope on public.user_profiles
for select using (id = auth.uid() or public.is_platform_admin());
create policy user_profiles_update_scope on public.user_profiles
for update using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

drop policy if exists "agents org isolation" on public.agents;
create policy agents_select_scope on public.agents
for select using (public.is_member_of_org(organization_id));
create policy agents_write_scope on public.agents
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "api keys org isolation" on public.api_keys;
create policy api_keys_select_scope on public.api_keys
for select using (public.is_member_of_org(organization_id));
create policy api_keys_write_scope on public.api_keys
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "call events org isolation" on public.call_events;
create policy call_events_select_scope on public.call_events
for select using (public.is_member_of_org(organization_id));
create policy call_events_write_scope on public.call_events
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "calls org isolation" on public.calls;
create policy calls_select_scope on public.calls
for select using (public.is_member_of_org(organization_id));
create policy calls_write_scope on public.calls
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "campaigns org isolation" on public.campaigns;
create policy campaigns_select_scope on public.campaigns
for select using (public.is_member_of_org(organization_id));
create policy campaigns_write_scope on public.campaigns
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "contacts org isolation" on public.contacts;
create policy contacts_select_scope on public.contacts
for select using (public.is_member_of_org(organization_id));
create policy contacts_write_scope on public.contacts
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "phone numbers org isolation" on public.phone_numbers;
create policy phone_numbers_select_scope on public.phone_numbers
for select using (public.is_member_of_org(organization_id));
create policy phone_numbers_write_scope on public.phone_numbers
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "usage events org isolation" on public.usage_events;
create policy usage_events_select_scope on public.usage_events
for select using (public.is_member_of_org(organization_id));
create policy usage_events_write_scope on public.usage_events
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "voicemail assets org isolation" on public.voicemail_assets;
create policy voicemail_assets_select_scope on public.voicemail_assets
for select using (public.is_member_of_org(organization_id));
create policy voicemail_assets_write_scope on public.voicemail_assets
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists demo_blueprints_select_scope on public.demo_blueprints;
drop policy if exists demo_blueprints_write_scope on public.demo_blueprints;
create policy demo_blueprints_select_scope on public.demo_blueprints
for select using (public.is_member_of_org(organization_id));
create policy demo_blueprints_write_scope on public.demo_blueprints
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists workflow_boards_select_scope on public.workflow_boards;
drop policy if exists workflow_boards_write_scope on public.workflow_boards;
create policy workflow_boards_select_scope on public.workflow_boards
for select using (public.is_member_of_org(organization_id));
create policy workflow_boards_write_scope on public.workflow_boards
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists campaign_recipients_select_scope on public.campaign_recipients;
drop policy if exists campaign_recipients_write_scope on public.campaign_recipients;
create policy campaign_recipients_select_scope on public.campaign_recipients
for select using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and public.is_member_of_org(c.organization_id)
  )
);
create policy campaign_recipients_write_scope on public.campaign_recipients
for all using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and public.can_manage_org(c.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and public.can_manage_org(c.organization_id)
  )
);

insert into public.platform_admins (user_id)
select '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
where exists (
  select 1
  from auth.users
  where id = '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
)
on conflict (user_id) do nothing;

insert into public.user_profiles (id, email, full_name)
select
  '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid,
  'matt@bishoptech.dev',
  'Matt Bishop'
where exists (
  select 1
  from auth.users
  where id = '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
)
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(public.user_profiles.full_name, excluded.full_name);

insert into public.organization_members (organization_id, user_id, role, invited_by)
select
  o.id,
  '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid,
  'owner'::public.org_role,
  '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
from public.organizations o
where exists (
  select 1
  from auth.users
  where id = '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
)
and not exists (
  select 1
  from public.organization_members om
  where om.organization_id = o.id
    and om.user_id = '88468a26-2ba3-4ff2-833a-b3d77d5c42ac'::uuid
);
