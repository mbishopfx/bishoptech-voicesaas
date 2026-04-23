import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { runDemoProspector } from '@/lib/demo-prospector';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  organizationId: z.string().uuid(),
  businessName: z.string().optional(),
  websiteUrl: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  goal: z.string().optional(),
  targetPhoneNumber: z.string().optional(),
  notes: z.string().optional(),
  orchestrationMode: z.enum(['inbound', 'outbound', 'multi']).optional(),
  persistedBlueprintId: z.string().uuid().optional(),
});

function readString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : undefined;
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can run the demo prospector.' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const payload = payloadSchema.parse({
      organizationId: readString(formData.get('organizationId')),
      businessName: readString(formData.get('businessName')),
      websiteUrl: readString(formData.get('websiteUrl')),
      googleBusinessProfile: readString(formData.get('googleBusinessProfile')),
      goal: readString(formData.get('goal')),
      targetPhoneNumber: readString(formData.get('targetPhoneNumber')),
      notes: readString(formData.get('notes')),
      orchestrationMode: readString(formData.get('orchestrationMode')),
      persistedBlueprintId: readString(formData.get('persistedBlueprintId')),
    });

    const result = await runDemoProspector({
      ...payload,
      viewerId: viewer.id,
      files,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to run the demo prospector.' },
      { status: 400 },
    );
  }
}
