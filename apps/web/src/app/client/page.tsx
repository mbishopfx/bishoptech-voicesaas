import { AppShell } from '@/components/app-shell';
import {
  ClientAgentsSection,
  ClientCampaignsSection,
  ClientMetricsGrid,
  ClientOutcomeChartSection,
  ClientRecentCallsSection,
  ClientWorkspaceSummarySection,
} from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export default async function ClientPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="dashboard"
      headerMode="compact"
      eyebrow="Workspace"
      title={`${data.organizationName} overview`}
      description="Your live voice operation at a glance."
      actions={null}
    >
      <ClientMetricsGrid metrics={data.metrics} />

      <div className="command-content-grid">
        <ClientAgentsSection
          agents={data.agents}
          organizationName={data.organizationName}
          limit={4}
          actionHref="/client/agents"
          actionLabel="View all"
        />

        <aside className="command-side-stack">
          <ClientWorkspaceSummarySection data={data} />
          <ClientRecentCallsSection recentCalls={data.recentCalls} limit={5} actionHref="/client/calls" actionLabel="Open calls" />
        </aside>
      </div>

      <ClientOutcomeChartSection recentCalls={data.recentCalls} />
      <ClientCampaignsSection campaigns={data.campaigns} limit={5} actionHref="/client/campaigns" actionLabel="Manage campaigns" />
    </AppShell>
  );
}
