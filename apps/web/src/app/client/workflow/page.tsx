import { AppShell } from '@/components/app-shell';
import { WorkflowCanvas } from '@/components/workflow-canvas';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData, getWorkflowBoardForOrganization } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

type ClientWorkflowPageProps = {
  searchParams?: Promise<{
    board?: string;
  }>;
};

export default async function ClientWorkflowPage({ searchParams }: ClientWorkflowPageProps) {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);
  const params = await searchParams;
  const board = await getWorkflowBoardForOrganization(data.organizationId, params?.board);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="workflow"
      headerMode="compact"
      eyebrow="Workflow"
      title="Workflow"
    >
      <WorkflowCanvas organizationId={data.organizationId} initialBoard={board} />
    </AppShell>
  );
}
