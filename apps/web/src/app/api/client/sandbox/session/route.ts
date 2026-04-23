import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buildAssistantConfigSnapshot, normalizeAssistantConfig } from '@/lib/assistant-config';
import { getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { canViewerAccessOrganization } from '@/lib/voiceops-platform';
import { safeInsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createAssistant, type VapiAssistantPayload } from '@/lib/vapi';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

const sandboxSchema = z.object({
  organizationId: z.string().uuid(),
  agentId: z.string().uuid(),
  mode: z.enum(['draft', 'live']).default('live'),
  scenarioId: z.string().optional(),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to open the sandbox.' }, { status: 401 });
    }

    const payload = sandboxSchema.parse(await request.json());

    if (!canViewerAccessOrganization(viewer, payload.organizationId)) {
      return NextResponse.json({ error: 'You do not have access to this workspace.' }, { status: 403 });
    }

    if (!appConfig.vapi.publicKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_VAPI_PUBLIC_KEY is required for embedded sandbox calls.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const agentResult = await supabase
      .from('agents')
      .select('id, organization_id, name, vapi_assistant_id, config')
      .eq('id', payload.agentId)
      .eq('organization_id', payload.organizationId)
      .maybeSingle();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: 'Assistant not found in this workspace.' }, { status: 404 });
    }

    const agent = agentResult.data as {
      id: string;
      organization_id: string;
      name: string;
      vapi_assistant_id?: string | null;
      config: Record<string, unknown> | null;
    };
    const snapshot = normalizeAssistantConfig(agent.config, agent.name);
    const credentials = await resolveVapiCredentialsForOrganization(payload.organizationId);
    const sessionId = randomUUID();

    let assistantId = agent.vapi_assistant_id ?? '';

    if (payload.mode === 'draft') {
      const draftPayload = buildAssistantConfigSnapshot(snapshot.draftPayload as VapiAssistantPayload, {
        accountMode: snapshot.accountMode,
        livePayload: snapshot.livePayload,
      }).draftPayload;

      const created = await createAssistant(
        {
          ...draftPayload,
          name: `${agent.name} Draft Sandbox`,
          metadata: {
            ...((draftPayload.metadata as Record<string, unknown>) ?? {}),
            organizationId: payload.organizationId,
            sourceAgentId: payload.agentId,
            sandboxSessionId: sessionId,
            sandboxMode: 'draft',
          },
        },
        undefined,
        credentials.apiKey,
      );
      assistantId = created.id;
    }

    if (!assistantId) {
      return NextResponse.json({ error: 'This assistant is not published to Vapi yet.' }, { status: 400 });
    }

    await safeInsert(supabase, 'demo_sessions', {
      id: sessionId,
      organization_id: payload.organizationId,
      assistant_id: payload.agentId,
      target_phone_number: 'browser-sandbox',
      assigned_number_label: payload.mode === 'draft' ? 'Draft sandbox' : 'Live sandbox',
      scenario_label: payload.scenarioId ?? `${payload.mode} sandbox`,
      status: 'queued',
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: sessionId,
        assistantId,
        publicKey: appConfig.vapi.publicKey,
        mode: payload.mode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start a sandbox session.' },
      { status: 400 },
    );
  }
}
