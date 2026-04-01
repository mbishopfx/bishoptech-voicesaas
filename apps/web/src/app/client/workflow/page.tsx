import { AppShell } from '@/components/app-shell';
import { WorkflowCanvas } from '@/components/workflow-canvas';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientWorkflowPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="workflow"
      headerMode="compact"
      eyebrow="Workflow"
      title="Routing canvas"
      description="Visualize the handoffs, notes, and flow logic that shape the live assistant behavior."
    >
      <WorkflowCanvas organizationId={data.organizationId} initialBoard={data.latestWorkflowBoard} />
    </AppShell>
  );
}
