import { AppShell } from '@/components/app-shell';
import { WorkflowCanvas } from '@/components/workflow-canvas';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export default async function AdminWorkflowPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="workflow"
      headerMode="compact"
      eyebrow="Workflow"
      title="Visual routing canvas"
      description="Map the handoffs, objections, and routing logic before you present or deploy the workflow."
    >
      <WorkflowCanvas organizationId={data.activeOrganizationId} initialBoard={data.latestWorkflowBoard} />
    </AppShell>
  );
}
