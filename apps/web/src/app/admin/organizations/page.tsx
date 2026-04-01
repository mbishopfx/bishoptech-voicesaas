import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { OrganizationLoadSection, OrganizationRosterSection } from '@/components/admin-dashboard-sections';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export default async function AdminOrganizationsPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="organizations"
      headerMode="compact"
      eyebrow="Organizations"
      title="Account roster"
      description="Review every live workspace, assigned number, staffing count, and active assistant stack."
      actions={
        <Link className="voice-primary-button" href="/admin/onboarding">
          Onboard client
        </Link>
      }
    >
      <OrganizationRosterSection organizations={data.organizations} />
      <OrganizationLoadSection organizations={data.organizations} />
    </AppShell>
  );
}
