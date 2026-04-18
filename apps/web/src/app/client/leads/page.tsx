import { AppShell } from '@/components/app-shell';
import { ClientLeadsSection, ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
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
      title="Lead pipeline"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]">
        <ClientLeadsSection leads={data.leads} />
        <aside className="space-y-6">
          <ClientWorkspaceSummarySection data={data} />
        </aside>
      </div>
    </AppShell>
  );
}
