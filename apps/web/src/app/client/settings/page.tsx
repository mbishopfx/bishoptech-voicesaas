import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { WorkspaceSettingsPanel } from '@/components/workspace-settings-panel';
import { Button } from '@/components/ui/button';
import { canManageOrganization, requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientSettingsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);
  const canEdit = canManageOrganization(viewer, data.organizationId);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="settings"
      headerMode="compact"
      eyebrow="Settings"
      title="Workspace settings"
      actions={
        <Button asChild variant="outline">
          <Link href="/client/agents">Back to agents</Link>
        </Button>
      }
    >
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkspaceSettingsPanel
          organizationId={data.organizationId}
          organizationName={data.organizationName}
          organizationSlug={data.organizationSlug}
          planName={data.planName}
          timezone={data.timezone}
          accountMode={data.vapiAccountMode}
          credentialMode={data.vapiApiKeyId ? 'byo' : 'managed'}
          vapiManagedLabel={data.vapiManagedLabel}
          vapiApiKeyId={data.vapiApiKeyId}
          vapiApiKeyLabel={data.vapiApiKeyLabel}
          canEdit={canEdit}
        />

        <aside className="space-y-6">
          <ClientWorkspaceSummarySection data={data} showSettingsLink={false} />
        </aside>
      </div>
    </AppShell>
  );
}
