import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { launchDemoProspectorCall } from '@/lib/demo-prospector';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  demoBlueprintId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  assistantId: z.string().optional(),
  targetPhoneNumber: z.string().min(7),
});

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can place demo prospector test calls.' }, { status: 403 });
    }

    const payload = payloadSchema.parse(await request.json());
    const result = await launchDemoProspectorCall(payload);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to launch the demo prospector test call.' },
      { status: 400 },
    );
  }
}
