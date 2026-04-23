import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { syncAssistantInventory } from '@/lib/voiceops-platform';

const syncSchema = z.object({
  organizationId: z.string().uuid().optional(),
  mode: z.enum(['portfolio', 'workspace']).default('portfolio'),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can sync Vapi inventory.' }, { status: 403 });
    }

    const payload = syncSchema.parse(await request.json().catch(() => ({})));
    const summary = await syncAssistantInventory({
      organizationId: payload.organizationId,
      mode: payload.mode,
    });

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sync the Vapi portfolio.' },
      { status: 400 },
    );
  }
}
