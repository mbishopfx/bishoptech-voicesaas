import { AppShell } from '@/components/app-shell';
import { ClientAgentsSection, ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientAssistantsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="assistants"
      headerMode="compact"
      eyebrow="Assistants"
      title="Assistants"
    >
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <ClientAgentsSection agents={data.agents} organizationName={data.organizationName} />
        <aside className="space-y-6">
          <ClientWorkspaceSummarySection data={data} />
        </aside>
      </div>
    </AppShell>
  );
}
