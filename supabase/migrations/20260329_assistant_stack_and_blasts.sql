-- Assistant stack and outbound campaign support

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assistant_role_type') then
    create type assistant_role_type as enum ('inbound', 'outbound', 'specialist');
  end if;
end $$;

alter table clients
  add column if not exists orchestration_mode text not null default 'multi' check (orchestration_mode in ('inbound', 'outbound', 'multi')),
  add column if not exists vapi_squad_id text;

alter table assistants
  add column if not exists assistant_role assistant_role_type not null default 'inbound',
  add column if not exists handoff_target_assistant_id uuid references assistants(id) on delete set null;

create table if not exists blast_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  campaign_name text not null,
  vapi_campaign_id text,
  assistant_id text not null,
  script text not null,
  voice_label text,
  phone_number_id text,
  recipients_accepted integer not null default 0,
  recipients_rejected integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists blast_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  blast_campaign_id uuid not null references blast_campaigns(id) on delete cascade,
  contact_name text,
  phone_number text not null,
  row_number integer not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create index if not exists idx_assistants_client_role on assistants(client_id, assistant_role);
create index if not exists idx_blast_campaigns_client_created on blast_campaigns(client_id, created_at desc);
create index if not exists idx_blast_campaign_recipients_campaign on blast_campaign_recipients(blast_campaign_id);

alter table blast_campaigns enable row level security;
alter table blast_campaign_recipients enable row level security;

create policy blast_campaigns_select_tenant_scope on blast_campaigns
for select using (
  client_id in (
    select c.id
    from clients c
    where c.tenant_id in (select tenant_id from app_current_user_tenants)
  )
);

create policy blast_campaign_recipients_select_tenant_scope on blast_campaign_recipients
for select using (
  blast_campaign_id in (
    select bc.id
    from blast_campaigns bc
    join clients c on c.id = bc.client_id
    where c.tenant_id in (select tenant_id from app_current_user_tenants)
  )
);
