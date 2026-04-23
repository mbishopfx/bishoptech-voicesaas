import { AppShell } from '@/components/app-shell';
import { ClientTicketCenter } from '@/components/client-ticket-center';
import { requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';
import { loadSupportTickets } from '@/lib/voiceops-platform';

export const dynamic = 'force-dynamic';

export default async function ClientTicketsPage() {
  const viewer = await requireViewer();
  const data = await getClientDashboardData(viewer);
  const tickets = await loadSupportTickets(data.organizationId);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="tickets"
      headerMode="compact"
      eyebrow="Requests"
      title="Support requests"
    >
      <ClientTicketCenter organizationId={data.organizationId} agents={data.agents} initialTickets={tickets} />
    </AppShell>
  );
}
