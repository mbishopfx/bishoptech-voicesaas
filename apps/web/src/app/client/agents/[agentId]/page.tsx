import { notFound } from 'next/navigation';
import Link from 'next/link';

import { AgentEditor } from '@/components/agent-editor';
import { AppShell } from '@/components/app-shell';
import { ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { Button } from '@/components/ui/button';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';
import { canManageOrganization } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type AgentPageProps = {
  params: Promise<{
    agentId: string;
  }>;
};

export default async function ClientAgentPage({ params }: AgentPageProps) {
  const viewer = await requireViewer();
  const { agentId } = await params;
  const data = await getClientDashboardData(viewer);
  const agent = data.agents.find((item) => item.id === agentId);

  if (!agent) {
    notFound();
  }

  const selectedAgent = agent;
  const canEdit = canManageOrganization(viewer, data.organizationId);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="agents"
      headerMode="compact"
      eyebrow="Agents"
      title={selectedAgent.name}
      actions={
        <Button asChild variant="outline" className="rounded-md">
          <Link href="/client/agents">Back to agents</Link>
        </Button>
      }
    >
      <div className="command-content-grid">
        <AgentEditor agent={selectedAgent} organizationName={data.organizationName} canEdit={canEdit} />
        <aside className="command-side-stack">
          <ClientWorkspaceSummarySection data={data} />
        </aside>
      </div>
    </AppShell>
  );
}
