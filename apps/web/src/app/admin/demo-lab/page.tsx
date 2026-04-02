import { AppShell } from '@/components/app-shell';
import { AdminBlueprintHistorySection } from '@/components/admin-dashboard-sections';
import { DemoStudio } from '@/components/demo-studio';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function AdminDemoLabPage() {
  const viewer = await requirePlatformAdmin();
  const data = await getAdminDashboardData(viewer);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="demo-lab"
      headerMode="compact"
      eyebrow="Demo lab"
      title="Demo lab"
    >
      <DemoStudio organizationId={data.activeOrganizationId} recentBlueprints={data.recentBlueprints} />
      <AdminBlueprintHistorySection recentBlueprints={data.recentBlueprints} />
    </AppShell>
  );
}
