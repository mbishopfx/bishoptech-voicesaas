import { NextResponse } from 'next/server';

import { requirePlatformAdmin } from '@/lib/auth';
import { icpTemplatePacks, playbookDocuments } from '@/lib/icp-packs';

export async function GET() {
  await requirePlatformAdmin();

  return NextResponse.json({
    packs: icpTemplatePacks,
    playbooks: playbookDocuments,
  });
}
