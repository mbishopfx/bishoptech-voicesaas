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
      eyebrow="Operator Command Center"
      title="VoiceOps Command Center"
      description="Provision refined vertical stacks, reserve demo numbers, recover failed lead data, and keep the Vapi-backed portfolio operational from one surface."
    >
      <AdminCommandCenter data={data} />
    </AppShell>
  );
}
