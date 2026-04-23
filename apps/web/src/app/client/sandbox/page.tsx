import { AppShell } from '@/components/app-shell';
import { ClientSandboxPanel } from '@/components/client-sandbox-panel';
import { requireViewer } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientSandboxPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="sandbox"
      headerMode="compact"
      eyebrow="Sandbox"
      title="Assistant sandbox"
      description="Run live or draft browser calls, compare tone and behavior, and keep revisions inside the workspace."
    >
      <ClientSandboxPanel
        organizationId={data.organizationId}
        agents={data.agents}
        publicKey={appConfig.vapi.publicKey}
        scenarios={data.playgroundScenarios}
      />
    </AppShell>
  );
}
