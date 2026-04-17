import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePlatformAdmin } from '@/lib/auth';
import { buildAssistantConfigSnapshot } from '@/lib/assistant-config';
import { buildClientAssistantDefinitions } from '@/lib/client-stack';
import { getIcpTemplatePack } from '@/lib/icp-packs';
import { safeInsert, safeUpsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createAssistant } from '@/lib/vapi';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

const assistantFactorySchema = z.object({
  organizationId: z.string().uuid(),
  businessName: z.string().min(2),
  vertical: z.string().min(2).optional(),
  icpPackId: z.string().min(1),
  orchestrationMode: z.enum(['inbound', 'outbound', 'multi']).default('multi'),
  websiteUrl: z.string().url().optional(),
  googleBusinessProfile: z.string().optional(),
  publishToVapi: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();

    const payload = assistantFactorySchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();
    const icpPack = getIcpTemplatePack(payload.icpPackId);
    const assistants = buildClientAssistantDefinitions({
      businessName: payload.businessName,
      vertical: payload.vertical ?? icpPack.label,
      orchestrationMode: payload.orchestrationMode,
      websiteUrl: payload.websiteUrl,
      googleBusinessProfile: payload.googleBusinessProfile,
    });
    const credentials = payload.publishToVapi
      ? await resolveVapiCredentialsForOrganization(payload.organizationId)
      : null;

    const createdAssistants = await Promise.all(
      assistants.map(async (assistantDefinition, index) => {
        const publishedAssistant = payload.publishToVapi && credentials
          ? await createAssistant(
              {
                ...assistantDefinition.payload,
                metadata: {
                  organizationId: payload.organizationId,
                  icpPackId: icpPack.id,
                  managedBy: 'voiceops-assistant-factory',
                },
              },
              `factory-${payload.organizationId}-${assistantDefinition.role}-${index + 1}`,
              credentials.apiKey,
            )
          : null;

        const configSnapshot = buildAssistantConfigSnapshot(assistantDefinition.payload, {
          syncStatus: publishedAssistant ? 'synced' : 'draft',
          livePayload: assistantDefinition.payload,
        });

        const agentId = randomUUID();
        await safeUpsert(
          supabase,
          'agents',
          {
            id: agentId,
            organization_id: payload.organizationId,
            name: assistantDefinition.name,
            agent_type: assistantDefinition.role,
            vapi_assistant_id: publishedAssistant?.id ?? null,
            is_active: true,
            config: {
              ...configSnapshot,
              icpPackId: icpPack.id,
              purpose: assistantDefinition.purpose,
            },
            vapi_sync_status: publishedAssistant ? 'synced' : 'draft',
          },
          { onConflict: 'id' },
        );

        await safeInsert(supabase, 'agent_revisions', {
          organization_id: payload.organizationId,
          agent_id: agentId,
          action: publishedAssistant ? 'published' : 'draft_saved',
          version: 1,
          draft_payload: assistantDefinition.payload,
          live_payload: assistantDefinition.payload,
          note: `${icpPack.label} stack created from Assistant Factory.`,
        });

        return {
          id: agentId,
          name: assistantDefinition.name,
          role: assistantDefinition.role,
          vapiAssistantId: publishedAssistant?.id ?? null,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      icpPack,
      assistants: createdAssistants,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Assistant Factory failed.' },
      { status: 400 },
    );
  }
}
