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
      eyebrow="Client Operations Console"
      title="Client Operations Console"
      description="See exactly what the assistant stack is doing: recovered leads, call quality, enrichment status, and live playground confidence without touching protected operator settings."
    >
      <ClientCommandCenter data={data} />
    </AppShell>
  );
}
