import { AppShell } from '@/components/app-shell';
import { CallCommandCenter } from '@/components/call-command-center';
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
      title="Calls"
    >
      <CallCommandCenter recentCalls={data.recentCalls} mode="admin" />
    </AppShell>
  );
}
