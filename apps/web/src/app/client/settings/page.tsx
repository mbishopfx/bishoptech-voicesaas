import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { ClientWorkspaceSettingsPanel } from '@/components/client-workspace-settings-panel';
import { Button } from '@/components/ui/button';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientSettingsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="settings"
      headerMode="compact"
      eyebrow="Settings"
      title="Workspace details"
      actions={
        <Button asChild variant="outline">
          <Link href="/client">Back to overview</Link>
        </Button>
      }
    >
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <ClientWorkspaceSettingsPanel
          organizationName={data.organizationName}
          organizationSlug={data.organizationSlug}
          planName={data.planName}
          timezone={data.timezone}
          phoneNumberCount={data.phoneNumbers.length}
          assistantCount={data.agents.length}
          campaignCount={data.campaigns.length}
        />

        <aside className="space-y-6">
          <ClientWorkspaceSummarySection data={data} showSettingsLink={false} />
        </aside>
      </div>
    </AppShell>
  );
}
