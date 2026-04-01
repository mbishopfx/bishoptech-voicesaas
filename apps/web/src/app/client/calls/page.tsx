import { AppShell } from '@/components/app-shell';
import {
  ClientCallLogSection,
  ClientOutcomeChartSection,
  ClientRecentCallsSection,
} from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export default async function ClientCallsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="calls"
      headerMode="compact"
      eyebrow="Calls"
      title="Conversation history"
      description="Review recent activity, downloadable recordings, and the outcomes across the latest call traffic."
    >
      <div className="command-content-grid">
        <ClientCallLogSection recentCalls={data.recentCalls} />
        <aside className="command-side-stack">
          <ClientRecentCallsSection recentCalls={data.recentCalls} />
        </aside>
      </div>

      <ClientOutcomeChartSection recentCalls={data.recentCalls} />
    </AppShell>
  );
}
