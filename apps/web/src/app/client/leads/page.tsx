import { AppShell } from '@/components/app-shell';
import { ClientLeadsSection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientLeadsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="leads"
      headerMode="compact"
      eyebrow="Leads"
      title="Leads"
    >
      <ClientLeadsSection leads={data.leads} />
    </AppShell>
  );
}
