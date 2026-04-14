import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { OnboardingStudio } from '@/components/onboarding-studio';
import { Button } from '@/components/ui/button';
import { requirePlatformAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminOnboardingPage() {
  const viewer = await requirePlatformAdmin();

  return (
    <AppShell
      current="admin"
      viewer={viewer}
      activeNav="onboarding"
      headerMode="compact"
      eyebrow="Onboarding"
      title="Onboard workspace"
      actions={
        <Button asChild variant="outline" className="rounded-md">
          <Link href="/admin/organizations">View organizations</Link>
        </Button>
      }
    >
      <OnboardingStudio />
    </AppShell>
  );
}
