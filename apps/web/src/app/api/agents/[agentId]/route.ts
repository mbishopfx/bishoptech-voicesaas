import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { buildAssistantConfigSnapshot, normalizeAssistantConfig } from '@/lib/assistant-config';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSystemMessage } from '@/lib/assistant-config';
import { safeInsert } from '@/lib/ops-storage';
import { createAssistant, getAssistant, updateAssistant, type VapiAssistantPayload } from '@/lib/vapi';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

export const runtime = 'nodejs';

const assistantMessageSchema = z
  .object({
    role: z.enum(['system', 'assistant', 'user']),
    content: z.string(),
  })
  .passthrough();

const assistantPayloadSchema = z
  .object({
    name: z.string().min(1),
    firstMessage: z.string().optional(),
    model: z
      .object({
        provider: z.string().min(1),
        model: z.string().min(1),
        messages: z.array(assistantMessageSchema).min(1),
      })
      .passthrough(),
    voice: z
      .object({
        provider: z.string().min(1),
        voiceId: z.string().min(1),
        fallbackPlan: z
          .object({
            voices: z
              .array(
                z
                  .object({
                    provider: z.string().min(1),
                    voiceId: z.string().min(1),
                  })
                  .passthrough(),
              )
              .min(1),
          })
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const saveDraftSchema = z.object({
  draftPayload: assistantPayloadSchema,
  accountMode: z.enum(['managed', 'byo']).optional(),
});

const actionSchema = z.object({
  action: z.enum(['publish', 'sync', 'revert']),
  draftPayload: assistantPayloadSchema.optional(),
  accountMode: z.enum(['managed', 'byo']).optional(),
});

type AgentRow = {
  id: string;
  organization_id: string;
  name: string;
  agent_type: string;
  vapi_assistant_id: string | null;
  is_active: boolean;
  config: Record<string, unknown> | null;
  vapi_sync_status?: string | null;
  vapi_last_error?: string | null;
  vapi_last_synced_at?: string | null;
  vapi_last_published_at?: string | null;
  updated_at: string;
};

type RevisionRow = {
  id: string;
  action: string;
  version: number;
  created_at: string;
  note: string | null;
};

function serializeAssistantConfig(
  baseConfig: Record<string, unknown> | null,
  payload: VapiAssistantPayload,
  snapshot: {
    accountMode: 'managed' | 'byo';
    syncStatus: 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';
    lastError?: string | null;
    lastPublishedAt?: string | null;
    lastSyncedAt?: string | null;
    livePayload?: VapiAssistantPayload;
  },
) {
  return {
    ...(baseConfig ?? {}),
    accountMode: snapshot.accountMode,
    syncStatus: snapshot.syncStatus,
    lastError: snapshot.lastError ?? null,
    lastPublishedAt: snapshot.lastPublishedAt ?? null,
    lastSyncedAt: snapshot.lastSyncedAt ?? null,
    systemPrompt: getSystemMessage(payload),
    firstMessage: payload.firstMessage ?? '',
    modelProvider: payload.model.provider,
    modelName: payload.model.model,
    voiceProvider: payload.voice.provider,
    voiceId: payload.voice.voiceId,
    voiceLabel: payload.voice.voiceId,
    vapiPayload: payload,
    vapiDraftPayload: payload,
    vapiLivePayload: snapshot.livePayload ?? payload,
  };
}

async function loadAgent(agentId: string, supabase = getSupabaseAdminClient()) {
  const result = await supabase
    .from('agents')
    .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, vapi_sync_status, vapi_last_error, vapi_last_synced_at, vapi_last_published_at, updated_at')
    .eq('id', agentId)
    .maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'Agent not found.');
  }

  return result.data as AgentRow;
}

async function loadRevisions(agentId: string, supabase = getSupabaseAdminClient()) {
  const result = await supabase
    .from('agent_revisions')
    .select('id, action, version, created_at, note')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as RevisionRow[];
}

async function requireAgentAccess(agent: AgentRow, viewer: Awaited<ReturnType<typeof getViewerContext>>) {
  if (!viewer) {
    throw new Error('You must be signed in to manage assistants.');
  }

  if (viewer.isPlatformAdmin) {
    return;
  }

  const membership = viewer.memberships.find((item) => item.organizationId === agent.organization_id);

  if (!membership) {
    throw new Error('You do not have access to this assistant.');
  }
}

function buildRevisionNote(action: string, payload: VapiAssistantPayload | null, error?: string | null) {
  if (error) {
    return `${action}: ${error}`;
  }

  if (!payload) {
    return action;
  }

  return `${action}: ${payload.name}`;
}

function diffProtectedKeys(previous: VapiAssistantPayload, next: VapiAssistantPayload) {
  const changed: string[] = [];
  const previousModel = previous.model ?? { provider: '', model: '' };
  const nextModel = next.model ?? { provider: '', model: '' };

  if (previousModel.provider !== nextModel.provider) {
    changed.push('model.provider');
  }

  if (previousModel.model !== nextModel.model) {
    changed.push('model.model');
  }

  if (JSON.stringify(previous.server ?? null) !== JSON.stringify(next.server ?? null)) {
    changed.push('server');
  }

  if (JSON.stringify(previous.tools ?? []) !== JSON.stringify(next.tools ?? [])) {
    changed.push('tools');
  }

  if (JSON.stringify(previous.hooks ?? []) !== JSON.stringify(next.hooks ?? [])) {
    changed.push('hooks');
  }

  if (JSON.stringify(previous.credentialIds ?? []) !== JSON.stringify(next.credentialIds ?? [])) {
    changed.push('credentialIds');
  }

  if (JSON.stringify(previous.metadata ?? {}) !== JSON.stringify(next.metadata ?? {})) {
    changed.push('metadata');
  }

  return changed;
}

async function persistRevision(
  supabase = getSupabaseAdminClient(),
  agent: AgentRow,
  viewerId: string | null,
  action: 'draft_saved' | 'published' | 'synced' | 'reverted',
  draftPayload: VapiAssistantPayload,
  livePayload: VapiAssistantPayload,
  note?: string | null,
) {
  const revisionResult = await supabase
    .from('agent_revisions')
    .select('version')
    .eq('agent_id', agent.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentVersion = revisionResult.data?.version ?? 0;

  const insertResult = await supabase
    .from('agent_revisions')
    .insert({
      organization_id: agent.organization_id,
      agent_id: agent.id,
      action,
      version: currentVersion + 1,
      draft_payload: draftPayload,
      live_payload: livePayload,
      actor_user_id: viewerId,
      note: note ?? null,
    })
    .select('id')
    .single();

  if (insertResult.error || !insertResult.data) {
    throw new Error(insertResult.error?.message ?? 'Unable to record the assistant revision.');
  }

  return insertResult.data.id as string;
}

async function updateAgentRecord(
  supabase = getSupabaseAdminClient(),
  agent: AgentRow,
  config: Record<string, unknown>,
  payload: VapiAssistantPayload,
  snapshot: {
    accountMode: 'managed' | 'byo';
    syncStatus: 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';
    lastError?: string | null;
    lastPublishedAt?: string | null;
    lastSyncedAt?: string | null;
    livePayload?: VapiAssistantPayload;
    assistantId?: string | null;
  },
) {
  const updateResult = await supabase
    .from('agents')
    .update({
      vapi_assistant_id: snapshot.assistantId ?? agent.vapi_assistant_id ?? null,
      config: serializeAssistantConfig(config, payload, snapshot),
      vapi_sync_status: snapshot.syncStatus,
      vapi_last_error: snapshot.lastError ?? null,
      vapi_last_published_at: snapshot.lastPublishedAt ?? null,
      vapi_last_synced_at: snapshot.lastSyncedAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .select('id')
    .single();

  if (updateResult.error || !updateResult.data) {
    throw new Error(updateResult.error?.message ?? 'Unable to update the assistant record.');
  }
}

function toResponseAgent(agent: AgentRow, revisions: RevisionRow[]) {
  const snapshot = normalizeAssistantConfig(agent.config, agent.name);

  return {
    id: agent.id,
    organizationId: agent.organization_id,
    name: agent.name,
    role: agent.agent_type,
    vapiAssistantId: agent.vapi_assistant_id ?? undefined,
    isActive: agent.is_active,
    syncStatus: (agent.vapi_sync_status as 'synced' | 'draft' | 'dirty' | 'error' | 'unknown' | null) ?? snapshot.syncStatus,
    lastError: agent.vapi_last_error ?? snapshot.lastError ?? null,
    lastPublishedAt: agent.vapi_last_published_at ?? snapshot.lastPublishedAt ?? null,
    lastSyncedAt: agent.vapi_last_synced_at ?? snapshot.lastSyncedAt ?? null,
    accountMode: snapshot.accountMode,
    config: snapshot,
    draftPayload: snapshot.draftPayload,
    livePayload: snapshot.livePayload,
    revisions,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const viewer = await getViewerContext();
    const { agentId } = await params;
    const supabase = getSupabaseAdminClient();
    const agent = await loadAgent(agentId, supabase);

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to view assistants.' }, { status: 401 });
    }

    const hasMembership = viewer.isPlatformAdmin || viewer.memberships.some((item) => item.organizationId === agent.organization_id);

    if (!hasMembership) {
      return NextResponse.json({ error: 'You do not have access to this assistant.' }, { status: 403 });
    }

    const revisions = await loadRevisions(agent.id, supabase);

    return NextResponse.json({
      agent: toResponseAgent(agent, revisions),
      canEdit: canManageOrganization(viewer, agent.organization_id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load the assistant.',
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const viewer = await getViewerContext();
    const { agentId } = await params;
    const supabase = getSupabaseAdminClient();
    const agent = await loadAgent(agentId, supabase);

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to manage assistants.' }, { status: 401 });
    }

    await requireAgentAccess(agent, viewer);

    if (!canManageOrganization(viewer, agent.organization_id)) {
      return NextResponse.json({ error: 'You do not have permission to edit this assistant.' }, { status: 403 });
    }

    const payload = saveDraftSchema.parse(await request.json());
    const currentConfig = agent.config ?? {};
    const snapshot = buildAssistantConfigSnapshot(payload.draftPayload, {
      accountMode: payload.accountMode ?? normalizeAssistantConfig(currentConfig, agent.name).accountMode,
      syncStatus: 'draft',
      livePayload: normalizeAssistantConfig(currentConfig, agent.name).livePayload,
    });

    await updateAgentRecord(
      supabase,
      agent,
      currentConfig,
      snapshot.draftPayload,
      {
        accountMode: snapshot.accountMode,
        syncStatus: snapshot.syncStatus,
        lastError: null,
        lastPublishedAt: agent.vapi_last_published_at ?? null,
        lastSyncedAt: agent.vapi_last_synced_at ?? null,
        livePayload: snapshot.livePayload,
        assistantId: agent.vapi_assistant_id,
      },
    );

    await persistRevision(
      supabase,
      agent,
      viewer.id,
      'draft_saved',
      snapshot.draftPayload,
      snapshot.livePayload,
      buildRevisionNote('draft_saved', snapshot.draftPayload),
    );

    const updatedAgent = await loadAgent(agent.id, supabase);
    const revisions = await loadRevisions(agent.id, supabase);

    return NextResponse.json({
      ok: true,
      agent: toResponseAgent(updatedAgent, revisions),
      message: 'Draft saved locally.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save the draft.',
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const viewer = await getViewerContext();
    const { agentId } = await params;
    const supabase = getSupabaseAdminClient();
    const agent = await loadAgent(agentId, supabase);

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to manage assistants.' }, { status: 401 });
    }

    await requireAgentAccess(agent, viewer);

    if (!canManageOrganization(viewer, agent.organization_id)) {
      return NextResponse.json({ error: 'You do not have permission to change this assistant.' }, { status: 403 });
    }

    const payload = actionSchema.parse(await request.json());
    const normalizedExisting = normalizeAssistantConfig(agent.config, agent.name);
    const nextDraftPayload = payload.draftPayload ?? normalizedExisting.draftPayload;
    const credentials = await resolveVapiCredentialsForOrganization(agent.organization_id);

    if (payload.action === 'revert') {
      const nextConfig = buildAssistantConfigSnapshot(normalizedExisting.livePayload, {
        accountMode: payload.accountMode ?? normalizedExisting.accountMode,
        syncStatus: 'synced',
        livePayload: normalizedExisting.livePayload,
        lastPublishedAt: agent.vapi_last_published_at ?? null,
        lastSyncedAt: agent.vapi_last_synced_at ?? null,
      });

      await updateAgentRecord(
        supabase,
        agent,
        agent.config ?? {},
        nextConfig.draftPayload,
        {
          accountMode: nextConfig.accountMode,
          syncStatus: nextConfig.syncStatus,
          lastError: null,
          lastPublishedAt: agent.vapi_last_published_at ?? null,
          lastSyncedAt: agent.vapi_last_synced_at ?? null,
          livePayload: nextConfig.livePayload,
          assistantId: agent.vapi_assistant_id,
        },
      );

      await persistRevision(
        supabase,
        agent,
        viewer.id,
        'reverted',
        nextConfig.draftPayload,
        nextConfig.livePayload,
        buildRevisionNote('reverted', nextConfig.draftPayload),
      );

      const updatedAgent = await loadAgent(agent.id, supabase);
      const revisions = await loadRevisions(agent.id, supabase);

      return NextResponse.json({
        ok: true,
        agent: toResponseAgent(updatedAgent, revisions),
        message: 'Draft reverted to the last live snapshot.',
      });
    }

    if (payload.action === 'sync') {
      if (!agent.vapi_assistant_id) {
        return NextResponse.json({ error: 'This assistant has not been published to Vapi yet.' }, { status: 400 });
      }

      const remoteAssistant = await getAssistant(agent.vapi_assistant_id, credentials.apiKey);
      const liveSnapshot = buildAssistantConfigSnapshot(remoteAssistant, {
        accountMode: payload.accountMode ?? normalizedExisting.accountMode,
        syncStatus: 'synced',
        livePayload: remoteAssistant,
        lastSyncedAt: new Date().toISOString(),
        lastPublishedAt: agent.vapi_last_published_at ?? null,
      });

      await updateAgentRecord(
        supabase,
        agent,
        agent.config ?? {},
        liveSnapshot.draftPayload,
        {
          accountMode: liveSnapshot.accountMode,
          syncStatus: liveSnapshot.syncStatus,
          lastError: null,
          lastPublishedAt: agent.vapi_last_published_at ?? null,
          lastSyncedAt: liveSnapshot.lastSyncedAt ?? new Date().toISOString(),
          livePayload: liveSnapshot.livePayload,
          assistantId: agent.vapi_assistant_id,
        },
      );

      await persistRevision(
        supabase,
        agent,
        viewer.id,
        'synced',
        liveSnapshot.draftPayload,
        liveSnapshot.livePayload,
        buildRevisionNote('synced', liveSnapshot.draftPayload),
      );

      const updatedAgent = await loadAgent(agent.id, supabase);
      const revisions = await loadRevisions(agent.id, supabase);

      return NextResponse.json({
        ok: true,
        agent: toResponseAgent(updatedAgent, revisions),
        message: 'Live assistant state synced back into the dashboard.',
      });
    }

    const publishPayload = nextDraftPayload;
    const protectedChanges = viewer.isPlatformAdmin ? [] : diffProtectedKeys(normalizedExisting.livePayload, publishPayload);

    if (protectedChanges.length) {
      const publishTimestamp = new Date().toISOString();
      const ticketDescription = [
        `Protected publish requested for ${agent.name}.`,
        '',
        `Changed protected keys: ${protectedChanges.join(', ')}`,
        '',
        `First message: ${publishPayload.firstMessage ?? 'Not provided'}`,
        '',
        'System prompt preview:',
        getSystemMessage(publishPayload).slice(0, 1200),
      ].join('\n');

      const draftSnapshot = buildAssistantConfigSnapshot(publishPayload, {
        accountMode: payload.accountMode ?? normalizedExisting.accountMode,
        syncStatus: 'draft',
        livePayload: normalizedExisting.livePayload,
        lastPublishedAt: agent.vapi_last_published_at ?? null,
        lastSyncedAt: agent.vapi_last_synced_at ?? null,
      });

      await updateAgentRecord(
        supabase,
        agent,
        agent.config ?? {},
        draftSnapshot.draftPayload,
        {
          accountMode: draftSnapshot.accountMode,
          syncStatus: draftSnapshot.syncStatus,
          lastError: null,
          lastPublishedAt: agent.vapi_last_published_at ?? null,
          lastSyncedAt: agent.vapi_last_synced_at ?? null,
          livePayload: draftSnapshot.livePayload,
          assistantId: agent.vapi_assistant_id,
        },
      );

      await persistRevision(
        supabase,
        agent,
        viewer.id,
        'draft_saved',
        draftSnapshot.draftPayload,
        draftSnapshot.livePayload,
        buildRevisionNote('draft_saved', draftSnapshot.draftPayload),
      );

      const ticketId = randomUUID();
      await safeInsert(supabase, 'support_tickets', {
        id: ticketId,
        organization_id: agent.organization_id,
        agent_id: agent.id,
        requested_by: viewer.id,
        ticket_type: 'revision',
        status: 'open',
        priority: 'normal',
        subject: `Revision approval needed for ${agent.name}`,
        description: ticketDescription,
        metadata: {
          protectedKeys: protectedChanges,
          requestedAction: 'publish',
        },
        created_at: publishTimestamp,
        updated_at: publishTimestamp,
      });
      await safeInsert(supabase, 'ticket_messages', {
        id: randomUUID(),
        ticket_id: ticketId,
        organization_id: agent.organization_id,
        author_user_id: viewer.id,
        body: ticketDescription,
        is_internal: false,
        created_at: publishTimestamp,
      });

      const updatedAgent = await loadAgent(agent.id, supabase);
      const revisions = await loadRevisions(agent.id, supabase);

      return NextResponse.json({
        ok: true,
        agent: toResponseAgent(updatedAgent, revisions),
        message: 'Protected changes were saved as draft and converted into a revision ticket for operator review.',
      });
    }
    const createdNewAssistant = !agent.vapi_assistant_id;
    let publishedAssistantId = agent.vapi_assistant_id ?? null;
    let livePayload: VapiAssistantPayload;

    if (!publishedAssistantId) {
      const createdAssistant = await createAssistant(
        publishPayload,
        `assistant-publish-${agent.id}-${publishPayload.name}`,
        credentials.apiKey,
      );
      publishedAssistantId = createdAssistant.id;
      livePayload = {
        ...publishPayload,
        id: createdAssistant.id,
      };
    } else {
      livePayload = await updateAssistant(
        publishedAssistantId,
        publishPayload,
        `assistant-update-${agent.id}-${publishPayload.name}`,
        credentials.apiKey,
      );
    }

    const publishTimestamp = new Date().toISOString();
    const publishSnapshot = buildAssistantConfigSnapshot(publishPayload, {
      accountMode: payload.accountMode ?? normalizedExisting.accountMode,
      syncStatus: 'synced',
      livePayload,
      lastPublishedAt: publishTimestamp,
      lastSyncedAt: publishTimestamp,
    });

    await updateAgentRecord(
      supabase,
      agent,
      agent.config ?? {},
      publishSnapshot.draftPayload,
      {
        accountMode: publishSnapshot.accountMode,
        syncStatus: publishSnapshot.syncStatus,
        lastError: null,
        lastPublishedAt: publishTimestamp,
        lastSyncedAt: publishTimestamp,
        livePayload: publishSnapshot.livePayload,
        assistantId: publishedAssistantId,
      },
    );

    await persistRevision(
      supabase,
      agent,
      viewer.id,
      'published',
      publishSnapshot.draftPayload,
      publishSnapshot.livePayload,
      buildRevisionNote('published', publishSnapshot.draftPayload),
    );

    const updatedAgent = await loadAgent(agent.id, supabase);
    const revisions = await loadRevisions(agent.id, supabase);

    return NextResponse.json({
      ok: true,
      agent: toResponseAgent(updatedAgent, revisions),
      message: createdNewAssistant ? 'Assistant created and published to Vapi.' : 'Assistant published to Vapi.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to update the assistant.',
      },
      { status: 400 },
    );
  }
}
