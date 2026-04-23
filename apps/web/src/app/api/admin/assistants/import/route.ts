import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { importAssistantToWorkspace } from '@/lib/voiceops-platform';

const importSchema = z.object({
  assistantId: z.string().min(1),
  organizationId: z.string().uuid().optional(),
  mode: z.enum(['import', 'attach', 'clone', 'archive']).default('import'),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can import assistants.' }, { status: 403 });
    }

    const payload = importSchema.parse(await request.json());
    const result = await importAssistantToWorkspace(payload);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to import the assistant.' },
      { status: 400 },
    );
  }
}
