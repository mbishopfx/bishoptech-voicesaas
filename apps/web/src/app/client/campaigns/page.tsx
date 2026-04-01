import { AppShell } from '@/components/app-shell';
import { BlastCampaignStudio } from '@/components/blast-campaign-studio';
import { ClientCampaignsSection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

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
      title="Outbound campaigns"
      description="Launch CSV-driven blasts from the outbound assistant and monitor the campaigns already attached to the workspace."
    >
      <ClientCampaignsSection campaigns={data.campaigns} />
      <BlastCampaignStudio organizationId={data.organizationId} agents={data.agents} />
    </AppShell>
  );
}
