import { AppShell } from '@/components/app-shell';
import { AdminCommandCenter } from '@/components/admin-command-center';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="dashboard"
      eyebrow="Portfolio overview"
      title="Owner platform"
      description="See the full portfolio in one place: workspace health, call activity, assistant coverage, and the open work across every client."
    >
      <AdminCommandCenter data={data} />
    </AppShell>
  );
}
