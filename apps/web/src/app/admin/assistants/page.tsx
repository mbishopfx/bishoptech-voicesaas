import Link from 'next/link';

import { AdminAssistantRegistry } from '@/components/admin-assistant-registry';
import { AppShell } from '@/components/app-shell';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';
import { loadAdminAssistantInventory } from '@/lib/voiceops-platform';

export const dynamic = 'force-dynamic';

export default async function AdminAssistantsPage() {
  const viewer = await requirePlatformAdmin();
  const [inventory, dashboard] = await Promise.all([
    loadAdminAssistantInventory(),
    getAdminDashboardData(viewer),
  ]);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="assistants"
      headerMode="compact"
      eyebrow="Assistants"
      title="Portfolio assistant registry"
      description="Continuously synced Vapi inventory across managed and workspace-linked assistants."
      actions={
        <Link className="voice-primary-button" href="/admin/onboarding">
          Create from template
        </Link>
      }
    >
      <AdminAssistantRegistry inventory={inventory} organizations={dashboard.organizations} />
    </AppShell>
  );
}
