import { AppShell } from '@/components/app-shell';
import { WorkflowCanvas } from '@/components/workflow-canvas';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData, getWorkflowBoardForOrganization } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

type AdminWorkflowPageProps = {
  searchParams?: Promise<{
    board?: string;
  }>;
};

export default async function AdminWorkflowPage({ searchParams }: AdminWorkflowPageProps) {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);
  const params = await searchParams;
  const board = await getWorkflowBoardForOrganization(data.activeOrganizationId, params?.board);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="workflow"
      headerMode="compact"
      eyebrow="Workflow"
      title="Workflow"
    >
      <WorkflowCanvas organizationId={data.activeOrganizationId} initialBoard={board} />
    </AppShell>
  );
}
