-- Legacy client/assistant blast schema retired after the organization-scoped control-plane rewrite.
-- Keep the version as a no-op so fresh environments do not recreate the old clients/assistants lineage.

do $$
begin
  raise notice 'Skipping retired assistant stack migration in favor of organization-scoped assistant inventory.';
end $$;
