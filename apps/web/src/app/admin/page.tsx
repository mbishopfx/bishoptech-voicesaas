import { AppShell } from '@/components/app-shell';
import {
  AdminBlueprintHistorySection,
  AdminMetricsGrid,
  AdminRecentCallsSection,
  OrganizationLoadSection,
  OrganizationRosterSection,
} from '@/components/admin-dashboard-sections';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export default async function AdminPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell current="admin" viewer={viewer} activeNav="dashboard" headerMode="hidden">
      <AdminMetricsGrid metrics={data.metrics} />

      <div className="command-content-grid">
        <OrganizationRosterSection organizations={data.organizations} limit={6} actionHref="/admin/organizations" actionLabel="View all" />

        <aside className="command-side-stack">
          <AdminRecentCallsSection recentCalls={data.recentCalls} limit={5} actionHref="/admin/calls" actionLabel="Open calls" />
          <AdminBlueprintHistorySection
            recentBlueprints={data.recentBlueprints}
            limit={5}
            actionHref="/admin/demo-lab"
            actionLabel="Open demo lab"
          />
        </aside>
      </div>

      <OrganizationLoadSection organizations={data.organizations} limit={7} />
    </AppShell>
  );
}
