import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { buildAssistantConfigSnapshot } from '@/lib/assistant-config';
import { buildClientAssistantDefinitions } from '@/lib/client-stack';
import { appConfig } from '@/lib/app-config';
import { formatRelativeTime } from '@/lib/format';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { DashboardAgent, OnboardingResult } from '@/lib/types';
import { createAssistant, createSquad } from '@/lib/vapi';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

export const runtime = 'nodejs';

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  vertical: z.string().min(2),
  contactName: z.string().optional(),
  contactEmail: z.string().email(),
  password: z.string().min(8),
  contactPhone: z.string().optional(),
  timezone: z.string().default('America/Chicago'),
  websiteUrl: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  orchestrationMode: z.enum(['inbound', 'outbound', 'multi']).default('multi'),
  vapiAccountMode: z.enum(['managed', 'byo']).default('managed'),
  vapiApiKey: z.string().optional(),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can onboard new clients.' }, { status: 403 });
    }

    const payload = onboardingSchema.parse(await request.json());

    if (!appConfig.supabase.url || !appConfig.supabase.hasServiceRole) {
      throw new Error('Supabase admin access is required for onboarding.');
    }

    const supabase = getSupabaseAdminClient();
    const definitions = buildClientAssistantDefinitions(payload);
    const warnings: string[] = [];

    const authResponse = await supabase.auth.admin.createUser({
      email: payload.contactEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        business_name: payload.businessName,
        vertical: payload.vertical,
      },
    });

    if (authResponse.error || !authResponse.data.user) {
      throw new Error(authResponse.error?.message ?? 'Unable to create the Supabase auth user.');
    }

    const authUserId = authResponse.data.user.id;
    const organizationSlug = `${slugify(payload.businessName)}-${randomUUID().slice(0, 6)}`;

    const organizationInsert = await supabase
      .from('organizations')
      .insert({
        name: payload.businessName,
        slug: organizationSlug,
        plan_name: 'managed',
        timezone: payload.timezone,
      })
      .select('id')
      .single();

    if (organizationInsert.error || !organizationInsert.data) {
      throw new Error(organizationInsert.error?.message ?? 'Unable to create the organization record.');
    }

    const organizationId = organizationInsert.data.id;

    if (payload.vapiAccountMode === 'byo') {
      if (!payload.vapiApiKey?.trim()) {
        throw new Error('A BYO Vapi API key is required when BYO mode is selected.');
      }

      const apiKeyInsert = await supabase
        .from('api_keys')
        .insert({
          organization_id: organizationId,
          provider: 'vapi',
          label: `${payload.businessName} Vapi key`,
          secret_value: payload.vapiApiKey.trim(),
          is_default: true,
          metadata: {
            onboardingMode: 'byo',
          },
          created_by: viewer.id,
          updated_by: viewer.id,
        })
        .select('id')
        .single();

      if (apiKeyInsert.error || !apiKeyInsert.data) {
        throw new Error(apiKeyInsert.error?.message ?? 'Unable to store the BYO Vapi key.');
      }

      const orgUpdate = await supabase
        .from('organizations')
        .update({
          vapi_account_mode: 'byo',
          vapi_api_key_id: apiKeyInsert.data.id,
        })
        .eq('id', organizationId);

      if (orgUpdate.error) {
        throw new Error(orgUpdate.error.message);
      }
    } else {
      const orgUpdate = await supabase
        .from('organizations')
        .update({
          vapi_account_mode: 'managed',
          vapi_api_key_id: null,
        })
        .eq('id', organizationId);

      if (orgUpdate.error) {
        throw new Error(orgUpdate.error.message);
      }
    }

    const [{ error: profileError }, { error: membershipError }] = await Promise.all([
      supabase.from('user_profiles').upsert({
        id: authUserId,
        email: payload.contactEmail,
        full_name: payload.contactName,
        default_organization_id: organizationId,
      }),
      supabase.from('organization_members').insert({
        organization_id: organizationId,
        user_id: authUserId,
        role: 'admin',
        invited_by: viewer.id,
      }),
    ]);

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const credentials = await resolveVapiCredentialsForOrganization(organizationId);

    const createdAssistants: Array<{
      role: DashboardAgent['role'];
      name: string;
      purpose: string;
      vapiAssistantId: string;
      config: Record<string, unknown>;
    }> = [];

    for (const definition of definitions) {
      const created = await createAssistant(
        definition.payload,
        `${organizationSlug}-${definition.role}-${payload.contactEmail}`,
        credentials.apiKey,
      );

      const snapshot = buildAssistantConfigSnapshot(definition.payload, {
        accountMode: payload.vapiAccountMode,
        syncStatus: 'synced',
        livePayload: definition.payload,
        lastPublishedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      });

      createdAssistants.push({
        role: definition.role,
        name: definition.name,
        purpose: definition.purpose,
        vapiAssistantId: created.id,
        config: {
          purpose: definition.purpose,
          voiceId: appConfig.vapi.defaults.voiceId,
          voiceLabel: appConfig.vapi.defaults.voiceId,
          modelName: appConfig.vapi.defaults.modelName,
          modelProvider: appConfig.vapi.defaults.modelProvider,
          firstMessage: definition.payload.firstMessage,
          systemPrompt: definition.payload.model.messages[0]?.content ?? '',
          orchestrationMode: payload.orchestrationMode,
          vertical: payload.vertical,
          websiteUrl: payload.websiteUrl,
          googleBusinessProfile: payload.googleBusinessProfile,
          accountMode: payload.vapiAccountMode,
          syncStatus: snapshot.syncStatus,
          lastPublishedAt: snapshot.lastPublishedAt,
          lastSyncedAt: snapshot.lastSyncedAt,
          vapiPayload: snapshot.draftPayload,
          vapiDraftPayload: snapshot.draftPayload,
          vapiLivePayload: snapshot.livePayload,
        },
      });
    }

    let squadId: string | undefined;

    if (payload.orchestrationMode === 'multi') {
      const inbound = createdAssistants.find((assistant) => assistant.role === 'inbound');
      const specialist = createdAssistants.find((assistant) => assistant.role === 'specialist');

      if (inbound && specialist) {
        const squad = await createSquad({
          name: `${payload.businessName} Routing Squad`,
          members: [{ assistantId: inbound.vapiAssistantId }, { assistantId: specialist.vapiAssistantId }],
        }, `${organizationSlug}-squad-${payload.contactEmail}`, credentials.apiKey);

        squadId = squad.id;
      }
    }

    const agentInsert = await supabase
      .from('agents')
      .insert(
        createdAssistants.map((assistant) => ({
          organization_id: organizationId,
          name: assistant.name,
          agent_type: assistant.role,
          vapi_assistant_id: assistant.vapiAssistantId,
          is_active: true,
          created_by: viewer.id,
          config: {
            ...assistant.config,
            squadId,
          },
        })),
      )
      .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, updated_at');

    if (agentInsert.error) {
      throw new Error(agentInsert.error.message);
    }

    type InsertedAgentRow = {
      id: string;
      organization_id: string;
      name: string;
      agent_type: DashboardAgent['role'];
      vapi_assistant_id: string | null;
      is_active: boolean;
      config: Record<string, unknown> | null;
      updated_at: string;
    };

    const insertedAgents = (agentInsert.data ?? []) as InsertedAgentRow[];

    const agents: DashboardAgent[] = insertedAgents.map((agent: InsertedAgentRow) => ({
      id: agent.id,
      organizationId: agent.organization_id,
      name: agent.name,
      role: agent.agent_type,
      vapiAssistantId: agent.vapi_assistant_id ?? undefined,
      voice: String(agent.config?.voiceLabel ?? appConfig.vapi.defaults.voiceId),
      model: String(agent.config?.modelName ?? appConfig.vapi.defaults.modelName),
      status: agent.is_active ? 'live' : 'pending',
      purpose: String(agent.config?.purpose ?? 'Assistant provisioned.'),
      lastSyncedAt: formatRelativeTime(agent.updated_at),
    }));

    const result: OnboardingResult = {
      mode: 'live',
      organizationId,
      authUserId,
      email: payload.contactEmail,
      organizationSlug,
      orchestrationMode: payload.orchestrationMode,
      vapiAccountMode: payload.vapiAccountMode,
      vapiCredentialMode: payload.vapiAccountMode === 'byo' ? 'byo' : credentials.source === 'env' ? 'managed' : 'none',
      agents,
      warnings,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to onboard the client.',
      },
      { status: 400 },
    );
  }
}
