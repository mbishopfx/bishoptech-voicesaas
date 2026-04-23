import { AppShell } from '@/components/app-shell';
import { AdminBlueprintHistorySection } from '@/components/admin-dashboard-sections';
import { DemoStudio } from '@/components/demo-studio';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAdminDashboardData } from '@/lib/dashboard-data';
import { getLaunchReadinessChecklist } from '@/lib/launch-readiness';

export const dynamic = 'force-dynamic';

export default async function AdminDemoLabPage() {
  const viewer = await requirePlatformAdmin();
  const [data, releaseGate] = await Promise.all([getAdminDashboardData(viewer), getLaunchReadinessChecklist()]);

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="demo-lab"
      headerMode="compact"
      eyebrow="Demo lab"
      title="Demo lab"
    >
      <DemoStudio organizationId={data.activeOrganizationId} recentBlueprints={data.recentBlueprints} releaseGate={releaseGate} />
      <AdminBlueprintHistorySection recentBlueprints={data.recentBlueprints} />
    </AppShell>
  );
}
