import { AppShell } from '@/components/app-shell';
import { ClientLeadsSection } from '@/components/client-dashboard-sections';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';

export default async function ClientLeadsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="leads"
      headerMode="compact"
      eyebrow="Leads"
      title="Lead capture"
      description="Review the contacts, service intent, urgency, and transcript excerpts captured by the voice stack."
    >
      <ClientLeadsSection leads={data.leads} />
    </AppShell>
  );
}
