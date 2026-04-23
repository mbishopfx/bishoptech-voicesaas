import { NextResponse } from 'next/server';

import { getViewerContext } from '@/lib/auth';
import { loadAdminAssistantInventory } from '@/lib/voiceops-platform';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can view the assistant registry.' }, { status: 403 });
    }

    const inventory = await loadAdminAssistantInventory();

    return NextResponse.json({
      ok: true,
      inventory,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load the assistant registry.' },
      { status: 400 },
    );
  }
}
