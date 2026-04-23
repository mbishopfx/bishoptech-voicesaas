import { AppShell } from '@/components/app-shell';
import { CallCommandCenter } from '@/components/call-command-center';
import { WorkspaceExportButton } from '@/components/workspace-export-button';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

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
      title="Calls"
      actions={
        <WorkspaceExportButton
          organizationId={data.organizationId}
          exportType="calls-json"
          label="Export calls"
        />
      }
    >
      <CallCommandCenter recentCalls={data.recentCalls} mode="client" />
    </AppShell>
  );
}
