-- Follow-up RLS policy skeletons for role-aware access
-- Customize with your exact auth + tenant mapping strategy before production.

-- Helper view for current user's tenant IDs
create or replace view app_current_user_tenants as
select m.tenant_id, m.role
from memberships m
where m.user_id = auth.uid();

-- Generic tenant-scoped select policies (examples)
create policy clients_select_tenant_scope on clients
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

create policy assistants_select_tenant_scope on assistants
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

create policy call_events_select_tenant_scope on call_events
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

create policy bookings_select_tenant_scope on bookings
for select using (
  tenant_id in (select tenant_id from app_current_user_tenants)
);

-- Insert/update policies should enforce role checks (tenant_admin/platform_admin).
-- Keep strict write gates; never allow client_readonly writes.
