-- Legacy pre-org-auth demo canvas migration.
-- The live schema moved to organizations/workspaces in 20260329_org_auth_and_canvas.sql.
-- Keep this version as a no-op so fresh environments do not try to recreate the retired tenants/clients tables.

do $$
begin
  raise notice 'Skipping retired demo canvas migration in favor of organization-scoped schema.';
end $$;
