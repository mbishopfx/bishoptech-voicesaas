import { AppShell } from '@/components/app-shell';
import { ClientCommandCenter } from '@/components/client-command-center';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="dashboard"
      eyebrow="Workspace overview"
      title="Workspace overview"
      description="Use this workspace to review calls, monitor new leads, test the live experience, and request updates from one place."
    >
      <ClientCommandCenter data={data} />
    </AppShell>
  );
}
