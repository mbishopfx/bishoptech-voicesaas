-- Legacy tenant-scoped RLS skeleton retired after the move to organization-scoped auth.
-- Keep the version as a no-op so fresh environments only apply the current org policies.

do $$
begin
  raise notice 'Skipping retired tenant RLS migration in favor of organization-scoped policies.';
end $$;
