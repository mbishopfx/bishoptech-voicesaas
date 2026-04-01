import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { buildClientAssistantDefinitions } from '@/lib/client-stack';
import { appConfig } from '@/lib/app-config';
import { formatRelativeTime } from '@/lib/format';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { DashboardAgent, OnboardingResult } from '@/lib/types';
import { createAssistant, createSquad } from '@/lib/vapi';

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

    if (!appConfig.supabase.url || !appConfig.supabase.hasServiceRole || !appConfig.vapi.apiKey) {
      throw new Error('Supabase admin access and Vapi API access are required for onboarding.');
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

    const createdAssistants: Array<{
      role: DashboardAgent['role'];
      name: string;
      purpose: string;
      vapiAssistantId: string;
      config: Record<string, unknown>;
    }> = [];

    for (const definition of definitions) {
      const created = await createAssistant(definition.payload, `${organizationSlug}-${definition.role}-${payload.contactEmail}`);

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
        });

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

    const agents: DashboardAgent[] = (agentInsert.data ?? []).map((agent) => ({
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
