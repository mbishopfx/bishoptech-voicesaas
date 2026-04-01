import { AppShell } from '@/components/app-shell';
import { ClientAgentsSection, ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientAgentsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="agents"
      headerMode="compact"
      eyebrow="Agents"
      title="Assistant stack"
      description="See the live inbound, outbound, and specialist agents currently assigned to the workspace."
    >
      <div className="command-content-grid">
        <ClientAgentsSection agents={data.agents} organizationName={data.organizationName} />
        <aside className="command-side-stack">
          <ClientWorkspaceSummarySection data={data} />
        </aside>
      </div>
    </AppShell>
  );
}
