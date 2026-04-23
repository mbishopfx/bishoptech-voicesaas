do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_ticket_type') then
    create type public.support_ticket_type as enum ('revision', 'question', 'bug', 'meeting');
  end if;

  if not exists (select 1 from pg_type where typname = 'support_ticket_status') then
    create type public.support_ticket_status as enum ('open', 'in_review', 'waiting_on_client', 'scheduled', 'resolved', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'export_job_status') then
    create type public.export_job_status as enum ('queued', 'completed', 'failed');
  end if;
end $$;

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  onboarding_status text not null default 'active',
  support_tier text not null default 'standard',
  commercial_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  local_agent_id uuid references public.agents(id) on delete set null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  remote_assistant_id text not null unique,
  name text not null,
  provider text not null default 'vapi',
  account_mode public.vapi_account_mode_type not null default 'managed',
  sync_status text not null default 'synced',
  managed_by text,
  icp_pack_id text references public.icp_template_packs(id) on delete set null,
  remote_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  last_seen_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  mode text not null default 'portfolio' check (mode in ('portfolio', 'workspace')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  assistants_seen integer not null default 0,
  assistants_changed integer not null default 0,
  assistants_attached integer not null default 0,
  phones_seen integer not null default 0,
  calls_seen integer not null default 0,
  request_metadata jsonb not null default '{}'::jsonb,
  error_text text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  ticket_type public.support_ticket_type not null,
  status public.support_ticket_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  subject text not null,
  description text not null,
  preferred_meeting_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  export_type text not null,
  status public.export_job_status not null default 'queued',
  filters jsonb not null default '{}'::jsonb,
  file_name text,
  mime_type text,
  artifact_path text,
  error_text text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.calls
  add column if not exists agent_id uuid,
  add column if not exists vapi_assistant_id text,
  add column if not exists vapi_call_id text,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists recording_url text,
  add column if not exists transcript_json jsonb not null default '[]'::jsonb,
  add column if not exists cost_usd numeric(10,4),
  add column if not exists latency_ms integer,
  add column if not exists disposition text,
  add column if not exists win_status text,
  add column if not exists raw_event_id text;

alter table public.contacts
  add column if not exists pipeline_stage text not null default 'new',
  add column if not exists owner_user_id uuid,
  add column if not exists last_call_id uuid,
  add column if not exists last_call_at timestamptz,
  add column if not exists win_status text,
  add column if not exists notes text,
  add column if not exists export_metadata jsonb not null default '{}'::jsonb;

alter table public.icp_template_packs
  add column if not exists configuration_version integer not null default 1,
  add column if not exists is_archived boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calls_agent_id_fkey'
  ) then
    alter table public.calls
      add constraint calls_agent_id_fkey
      foreign key (agent_id) references public.agents(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contacts_owner_user_id_fkey'
  ) then
    alter table public.contacts
      add constraint contacts_owner_user_id_fkey
      foreign key (owner_user_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contacts_last_call_id_fkey'
  ) then
    alter table public.contacts
      add constraint contacts_last_call_id_fkey
      foreign key (last_call_id) references public.calls(id) on delete set null;
  end if;
end $$;

create index if not exists idx_client_accounts_org on public.client_accounts(organization_id);
create index if not exists idx_assistant_inventory_org_updated on public.assistant_inventory(organization_id, updated_at desc);
create index if not exists idx_assistant_inventory_agent on public.assistant_inventory(local_agent_id);
create index if not exists idx_assistant_sync_runs_org_started on public.assistant_sync_runs(organization_id, started_at desc);
create index if not exists idx_support_tickets_org_created on public.support_tickets(organization_id, created_at desc);
create index if not exists idx_support_tickets_agent_status on public.support_tickets(agent_id, status);
create index if not exists idx_ticket_messages_ticket_created on public.ticket_messages(ticket_id, created_at asc);
create index if not exists idx_export_jobs_org_created on public.export_jobs(organization_id, created_at desc);
create index if not exists idx_calls_agent_created on public.calls(agent_id, created_at desc);
create index if not exists idx_calls_vapi_assistant_created on public.calls(vapi_assistant_id, created_at desc);
create index if not exists idx_calls_started_at on public.calls(started_at desc);
create index if not exists idx_contacts_pipeline_stage on public.contacts(organization_id, pipeline_stage, updated_at desc);
create unique index if not exists idx_calls_vapi_call_id_unique on public.calls(vapi_call_id) where vapi_call_id is not null;

alter table public.client_accounts enable row level security;
alter table public.assistant_inventory enable row level security;
alter table public.assistant_sync_runs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.export_jobs enable row level security;

drop policy if exists client_accounts_select_scope on public.client_accounts;
create policy client_accounts_select_scope on public.client_accounts
for select using (public.is_member_of_org(organization_id));

drop policy if exists client_accounts_write_scope on public.client_accounts;
create policy client_accounts_write_scope on public.client_accounts
for all using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists assistant_inventory_select_scope on public.assistant_inventory;
create policy assistant_inventory_select_scope on public.assistant_inventory
for select using (
  public.is_platform_admin()
  or (organization_id is not null and public.is_member_of_org(organization_id))
);

drop policy if exists assistant_inventory_write_scope on public.assistant_inventory;
create policy assistant_inventory_write_scope on public.assistant_inventory
for all using (
  public.is_platform_admin()
  or (organization_id is not null and public.can_manage_org(organization_id))
)
with check (
  public.is_platform_admin()
  or (organization_id is not null and public.can_manage_org(organization_id))
);

drop policy if exists assistant_sync_runs_select_scope on public.assistant_sync_runs;
create policy assistant_sync_runs_select_scope on public.assistant_sync_runs
for select using (
  public.is_platform_admin()
  or (organization_id is not null and public.is_member_of_org(organization_id))
);

drop policy if exists assistant_sync_runs_write_scope on public.assistant_sync_runs;
create policy assistant_sync_runs_write_scope on public.assistant_sync_runs
for all using (
  public.is_platform_admin()
  or (organization_id is not null and public.can_manage_org(organization_id))
)
with check (
  public.is_platform_admin()
  or (organization_id is not null and public.can_manage_org(organization_id))
);

drop policy if exists support_tickets_select_scope on public.support_tickets;
create policy support_tickets_select_scope on public.support_tickets
for select using (public.is_member_of_org(organization_id));

drop policy if exists support_tickets_write_scope on public.support_tickets;
create policy support_tickets_write_scope on public.support_tickets
for all using (public.is_member_of_org(organization_id))
with check (public.is_member_of_org(organization_id));

drop policy if exists ticket_messages_select_scope on public.ticket_messages;
create policy ticket_messages_select_scope on public.ticket_messages
for select using (public.is_member_of_org(organization_id));

drop policy if exists ticket_messages_write_scope on public.ticket_messages;
create policy ticket_messages_write_scope on public.ticket_messages
for all using (public.is_member_of_org(organization_id))
with check (public.is_member_of_org(organization_id));

drop policy if exists export_jobs_select_scope on public.export_jobs;
create policy export_jobs_select_scope on public.export_jobs
for select using (public.is_member_of_org(organization_id));

drop policy if exists export_jobs_write_scope on public.export_jobs;
create policy export_jobs_write_scope on public.export_jobs
for all using (public.is_member_of_org(organization_id))
with check (public.is_member_of_org(organization_id));

drop policy if exists icp_template_packs_write_scope on public.icp_template_packs;
create policy icp_template_packs_write_scope on public.icp_template_packs
for all using (public.is_platform_admin())
with check (public.is_platform_admin());

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'trg_client_accounts_updated_at') then
    create trigger trg_client_accounts_updated_at
    before update on public.client_accounts
    for each row execute function public.set_updated_at();
  end if;

  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'trg_assistant_inventory_updated_at') then
    create trigger trg_assistant_inventory_updated_at
    before update on public.assistant_inventory
    for each row execute function public.set_updated_at();
  end if;

  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'trg_support_tickets_updated_at') then
    create trigger trg_support_tickets_updated_at
    before update on public.support_tickets
    for each row execute function public.set_updated_at();
  end if;
end $$;

insert into public.icp_template_packs (
  id,
  slug,
  label,
  vertical,
  summary,
  configuration,
  configuration_version,
  is_archived
)
values
  (
    'icp-home-services',
    'home-services',
    'Home Services Revenue Desk',
    'home-services',
    'Emergency-first call handling for HVAC, plumbing, electrical, and garage operators.',
    '{
      "positioning": "Qualify urgency, collect address and system details fast, then route to booking or dispatch without losing the lead.",
      "leadSchema": {
        "requiredFields": [
          {"key":"caller_name","label":"Caller name","description":"Primary contact for the service request.","kind":"text","required":true},
          {"key":"callback_number","label":"Callback number","description":"Best reachable phone number.","kind":"phone","required":true},
          {"key":"service_needed","label":"Service needed","description":"What kind of job the caller needs help with.","kind":"choice","required":true,"choices":["HVAC","Plumbing","Electrical","Garage","General"]},
          {"key":"urgency","label":"Urgency","description":"How time-sensitive the request is.","kind":"choice","required":true,"choices":["Emergency","Same day","This week","Flexible"]}
        ],
        "optionalFields": [
          {"key":"property_address","label":"Property address","description":"Street or zip to support dispatch.","kind":"text","required":false},
          {"key":"issue_notes","label":"Issue notes","description":"Symptoms, equipment, and failure details.","kind":"multiline","required":false}
        ]
      },
      "gradingRubric": [
        {"id":"speed","label":"Speed to qualification","weight":35,"successDefinition":"Assistant reaches service plus urgency plus callback data quickly."},
        {"id":"dispatch","label":"Dispatch readiness","weight":35,"successDefinition":"The transcript contains enough operational data to book or route."},
        {"id":"brand","label":"Brand control","weight":30,"successDefinition":"Tone stays calm, capable, and non-robotic for stressed callers."}
      ],
      "voicePreset": {"provider":"openai","voiceId":"cedar","style":"Confident, operational, concise."},
      "toolPreset": {
        "knowledgeMode":"qualification-first",
        "approvedToggles":["booking_rules","service-area","after-hours-handoff"],
        "protectedToggles":["compliance","refund-policy","emergency-routing"]
      },
      "testScenarios": [
        {"id":"after-hours-no-cool","label":"After-hours emergency","prompt":"My AC is out and the house is 89 degrees right now.","expectedOutcome":"Captures urgency, service, callback, and dispatch notes."},
        {"id":"quote-request","label":"Quote request","prompt":"I need someone to quote a new unit this month.","expectedOutcome":"Qualifies timeline and routes to non-emergency sales follow-up."}
      ],
      "docs": {
        "operatorGuide":"/docs/VOICEOPS_OPERATOR_GUIDE.md",
        "revisionGuide":"/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md",
        "recoveryGuide":"/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md"
      }
    }'::jsonb,
    1,
    false
  ),
  (
    'icp-dental',
    'dental',
    'Dental Front Desk',
    'dental',
    'Appointment-oriented intake for general dentistry, cosmetic consults, and emergency visits.',
    '{
      "positioning": "Sound like a polished front desk, collect patient readiness details, and keep the handoff clean for scheduling teams.",
      "leadSchema": {
        "requiredFields": [
          {"key":"patient_name","label":"Patient name","description":"Name of the person seeking care.","kind":"text","required":true},
          {"key":"phone","label":"Phone","description":"Best callback number.","kind":"phone","required":true},
          {"key":"visit_type","label":"Visit type","description":"Service or appointment intent.","kind":"choice","required":true,"choices":["Emergency","Cleaning","Consult","Implant","Cosmetic","General"]},
          {"key":"new_patient","label":"New patient","description":"Whether they are new to the practice.","kind":"boolean","required":true}
        ],
        "optionalFields": [
          {"key":"insurance","label":"Insurance","description":"Insurance or self-pay signal.","kind":"text","required":false},
          {"key":"preferred_time","label":"Preferred time","description":"Preferred callback or appointment window.","kind":"text","required":false}
        ]
      },
      "gradingRubric": [
        {"id":"warmth","label":"Front desk warmth","weight":30,"successDefinition":"Calls feel welcoming and human, especially for nervous patients."},
        {"id":"qualification","label":"Qualification completeness","weight":40,"successDefinition":"Visit type, new or existing status, and callback data are captured."},
        {"id":"conversion","label":"Booking intent","weight":30,"successDefinition":"Call ends with a concrete next step or schedule-ready note."}
      ],
      "voicePreset": {"provider":"openai","voiceId":"marin","style":"Warm, polished, reassuring."},
      "toolPreset": {
        "knowledgeMode":"faq-first",
        "approvedToggles":["office-hours","insurance-notes","consult-routing"],
        "protectedToggles":["medical-disclaimers","financing-policy","clinical-claims"]
      },
      "testScenarios": [
        {"id":"new-patient-cleaning","label":"New patient cleaning","prompt":"I just moved here and need a cleaning next week.","expectedOutcome":"Captures patient status, callback, and preferred schedule."},
        {"id":"emergency-tooth-pain","label":"Emergency pain","prompt":"My tooth is killing me and I need to know if you can see me today.","expectedOutcome":"Urgent triage with empathetic tone and clear next step."}
      ],
      "docs": {
        "operatorGuide":"/docs/VOICEOPS_OPERATOR_GUIDE.md",
        "revisionGuide":"/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md",
        "recoveryGuide":"/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md"
      }
    }'::jsonb,
    1,
    false
  ),
  (
    'icp-med-spa',
    'med-spa',
    'Med Spa Consult Concierge',
    'med-spa',
    'High-touch consult capture for aesthetics, injectables, body services, and treatment follow-up.',
    '{
      "positioning": "Make consult requests feel premium while still capturing the exact treatment intent and purchase signals the team needs.",
      "leadSchema": {
        "requiredFields": [
          {"key":"lead_name","label":"Lead name","description":"Prospective client full name.","kind":"text","required":true},
          {"key":"phone","label":"Phone","description":"Best number for consult follow-up.","kind":"phone","required":true},
          {"key":"treatment_interest","label":"Treatment interest","description":"Which service or result they want.","kind":"choice","required":true,"choices":["Botox","Filler","Skin","Laser","Weight loss","Consult"]},
          {"key":"timeline","label":"Timeline","description":"How soon they want treatment.","kind":"choice","required":true,"choices":["ASAP","This month","Next quarter","Researching"]}
        ],
        "optionalFields": [
          {"key":"budget_band","label":"Budget band","description":"Optional spend signal if they volunteer it.","kind":"text","required":false},
          {"key":"experience_level","label":"Experience level","description":"First time or repeat treatment familiarity.","kind":"choice","required":false,"choices":["First time","Some experience","Repeat client"]}
        ]
      },
      "gradingRubric": [
        {"id":"luxury-tone","label":"Luxury tone","weight":30,"successDefinition":"The assistant feels high-end, clear, and credible."},
        {"id":"consult-readiness","label":"Consult readiness","weight":40,"successDefinition":"Interest, timeline, and callback details are captured."},
        {"id":"objection-control","label":"Objection handling","weight":30,"successDefinition":"Pricing and safety questions are handled gracefully without over-claiming."}
      ],
      "voicePreset": {"provider":"openai","voiceId":"alloy","style":"Premium, calm, confidence-forward."},
      "toolPreset": {
        "knowledgeMode":"faq-first",
        "approvedToggles":["treatment-categories","consult-booking","financing-cta"],
        "protectedToggles":["medical-disclaimers","outcome-claims","eligibility-screening"]
      },
      "testScenarios": [
        {"id":"first-time-botox","label":"First-time Botox lead","prompt":"I have never done Botox before. How does it work and what would I need to do first?","expectedOutcome":"Premium consult capture without medical overreach."},
        {"id":"price-shopping","label":"Price shopper","prompt":"I am comparing a few med spas for filler. Can someone call me back today?","expectedOutcome":"Captures urgency and callback while keeping consult framed around value."}
      ],
      "docs": {
        "operatorGuide":"/docs/VOICEOPS_OPERATOR_GUIDE.md",
        "revisionGuide":"/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md",
        "recoveryGuide":"/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md"
      }
    }'::jsonb,
    1,
    false
  ),
  (
    'icp-legal',
    'legal',
    'Legal Intake Desk',
    'legal',
    'Matter-intake oriented conversations for firms that need fast qualification without over-promising.',
    '{
      "positioning": "Capture the case shape, urgency, and jurisdiction clues, then tee up a clean attorney callback or consult.",
      "leadSchema": {
        "requiredFields": [
          {"key":"prospect_name","label":"Prospect name","description":"Caller or prospect name.","kind":"text","required":true},
          {"key":"phone","label":"Phone","description":"Best callback number.","kind":"phone","required":true},
          {"key":"matter_type","label":"Matter type","description":"Practice area or issue category.","kind":"choice","required":true,"choices":["PI","Family","Criminal","Immigration","Business","Other"]},
          {"key":"urgency","label":"Urgency","description":"How time-sensitive the legal matter is.","kind":"choice","required":true,"choices":["Immediate","This week","Soon","Researching"]}
        ],
        "optionalFields": [
          {"key":"jurisdiction","label":"Jurisdiction","description":"State, county, or court context if known.","kind":"text","required":false},
          {"key":"conflict_name","label":"Conflict check name","description":"Opposing party or related name if volunteered.","kind":"text","required":false}
        ]
      },
      "gradingRubric": [
        {"id":"safety","label":"Legal safety","weight":35,"successDefinition":"No legal advice; language stays intake-safe and compliant."},
        {"id":"matter-fit","label":"Matter fit","weight":35,"successDefinition":"Matter type, urgency, and callback are captured."},
        {"id":"trust","label":"Trust and professionalism","weight":30,"successDefinition":"The assistant sounds serious, clear, and competent."}
      ],
      "voicePreset": {"provider":"openai","voiceId":"verse","style":"Composed, serious, trust-building."},
      "toolPreset": {
        "knowledgeMode":"handoff-first",
        "approvedToggles":["practice-areas","consult-routing","office-hours"],
        "protectedToggles":["legal-advice","settlement-claims","guarantees"]
      },
      "testScenarios": [
        {"id":"family-law-intake","label":"Family law consult","prompt":"I need to talk to someone about a custody issue this week.","expectedOutcome":"Captures matter type, urgency, and safe callback path."},
        {"id":"pi-urgent","label":"Personal injury urgency","prompt":"I was in a car accident yesterday and I am trying to figure out what to do next.","expectedOutcome":"Strong professional tone and clean intake without giving legal advice."}
      ],
      "docs": {
        "operatorGuide":"/docs/VOICEOPS_OPERATOR_GUIDE.md",
        "revisionGuide":"/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md",
        "recoveryGuide":"/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md"
      }
    }'::jsonb,
    1,
    false
  )
on conflict (id) do update set
  slug = excluded.slug,
  label = excluded.label,
  vertical = excluded.vertical,
  summary = excluded.summary,
  configuration = excluded.configuration,
  configuration_version = excluded.configuration_version,
  is_archived = excluded.is_archived,
  updated_at = now();
