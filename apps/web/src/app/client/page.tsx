import { AppShell } from '@/components/app-shell';
import {
  ClientAgentsSection,
  ClientCampaignsSection,
  ClientControlDeckSection,
  ClientMetricsGrid,
  ClientOutcomeChartSection,
  ClientRecentCallsSection,
  ClientWorkspaceSummarySection,
} from '@/components/client-dashboard-sections';
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
      headerMode="hidden"
      actions={null}
    >
      <ClientControlDeckSection data={data} />

      <ClientMetricsGrid metrics={data.metrics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <ClientAgentsSection
          agents={data.agents}
          organizationName={data.organizationName}
          limit={4}
          actionHref="/client/agents"
          actionLabel="View all"
        />

        <aside className="grid gap-6">
          <ClientWorkspaceSummarySection data={data} />
          <ClientRecentCallsSection recentCalls={data.recentCalls} limit={5} actionHref="/client/calls" actionLabel="Open calls" />
        </aside>
      </div>

      <ClientOutcomeChartSection recentCalls={data.recentCalls} />
      <ClientCampaignsSection campaigns={data.campaigns} limit={5} actionHref="/client/campaigns" actionLabel="Manage campaigns" />
    </AppShell>
  );
}
