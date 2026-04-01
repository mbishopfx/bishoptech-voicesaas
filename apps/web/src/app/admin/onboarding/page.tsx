import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { OnboardingStudio } from '@/components/onboarding-studio';
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
      title="Provision a new workspace"
      description="Create the login, attach the organization, and generate the managed assistant stack after the kickoff call."
      actions={
        <Link className="voice-secondary-button" href="/admin/organizations">
          View organizations
        </Link>
      }
    >
      <OnboardingStudio />
    </AppShell>
  );
}
