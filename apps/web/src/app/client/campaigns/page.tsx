import { AppShell } from '@/components/app-shell';
import { BlastCampaignStudio } from '@/components/blast-campaign-studio';
import { ClientCampaignsSection, ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function ClientCampaignsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="campaigns"
      headerMode="compact"
      eyebrow="Campaigns"
      title="Campaign assistant"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <div className="space-y-6">
          <ClientCampaignsSection campaigns={data.campaigns} />
          <BlastCampaignStudio organizationId={data.organizationId} agents={data.agents} />
        </div>
        <aside className="space-y-6">
          <ClientWorkspaceSummarySection data={data} />
        </aside>
      </div>
    </AppShell>
  );
}
