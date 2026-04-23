import path from 'node:path';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePlatformAdmin } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { syncDemoBlueprintKnowledgeBase } from '@/lib/demo-prospector';
import { syncVapiKnowledgePackToAssistant } from '@/lib/vapi-kb';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

export const runtime = 'nodejs';

const syncKnowledgeBaseSchema = z.object({
  demoBlueprintId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  assistantId: z.string().min(1).optional(),
  packDir: z.string().min(1).optional(),
  packSlug: z.string().min(1).optional(),
  businessName: z.string().min(2).optional(),
  knowledgeBaseName: z.string().min(2).optional(),
  queryToolName: z.string().min(2).optional(),
  queryToolDescription: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();

    const payload = syncKnowledgeBaseSchema.parse(await request.json());

    if (payload.demoBlueprintId) {
      const result = await syncDemoBlueprintKnowledgeBase({
        demoBlueprintId: payload.demoBlueprintId,
      });

      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    const packDir =
      payload.packDir?.trim() ||
      (payload.packSlug ? path.join(process.cwd(), 'generated', 'vapi-kb', payload.packSlug) : '');

    if (!packDir) {
      return NextResponse.json({ ok: false, error: 'Provide packDir or packSlug.' }, { status: 400 });
    }

    const credentials = payload.organizationId
      ? await resolveVapiCredentialsForOrganization(payload.organizationId)
      : { apiKey: appConfig.vapi.apiKey };

    const result = await syncVapiKnowledgePackToAssistant({
      packDir,
      assistantId: payload.assistantId,
      apiKey: credentials.apiKey,
      businessName: payload.businessName,
      knowledgeBaseName: payload.knowledgeBaseName,
      queryToolName: payload.queryToolName,
      queryToolDescription: payload.queryToolDescription,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to sync the knowledge base.',
      },
      { status: 400 },
    );
  }
}
