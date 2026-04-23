import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { OrganizationLoadSection, OrganizationRosterSection } from '@/components/admin-dashboard-sections';
import { Button } from '@/components/ui/button';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="clients"
      headerMode="compact"
      eyebrow="Clients"
      title="Clients"
      actions={
        <Button asChild size="lg">
          <Link href="/admin/onboarding">Onboard client</Link>
        </Button>
      }
    >
      <OrganizationRosterSection organizations={data.organizations} />
      <OrganizationLoadSection organizations={data.organizations} />
    </AppShell>
  );
}
