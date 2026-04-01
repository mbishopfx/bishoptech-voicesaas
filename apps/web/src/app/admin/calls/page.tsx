import { AppShell } from '@/components/app-shell';
import { AdminRecentCallsSection, OrganizationLoadSection } from '@/components/admin-dashboard-sections';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function AdminCallsPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="calls"
      headerMode="compact"
      eyebrow="Calls"
      title="Cross-account call activity"
      description="Review live call traffic and compare where the active assistant volume is sitting right now."
    >
      <AdminRecentCallsSection recentCalls={data.recentCalls} />
      <OrganizationLoadSection organizations={data.organizations} />
    </AppShell>
  );
}
