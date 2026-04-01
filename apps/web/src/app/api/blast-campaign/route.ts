import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { parseBlastCsv } from '@/lib/csv';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createAssistant, createCampaign } from '@/lib/vapi';

export const runtime = 'nodejs';

const blastCampaignSchema = z.object({
  organizationId: z.string().uuid(),
  campaignName: z.string().min(2),
  csvText: z.string().min(1),
  script: z.string().min(4),
  assistantId: z.string().uuid(),
  phoneNumberId: z.string().optional(),
  voiceLabel: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer) {
      return NextResponse.json({ error: 'You must be signed in to launch a campaign.' }, { status: 401 });
    }

    const payload = blastCampaignSchema.parse(await request.json());

    if (!canManageOrganization(viewer, payload.organizationId)) {
      return NextResponse.json({ error: 'You do not have permission to launch campaigns for this organization.' }, { status: 403 });
    }

    if (!appConfig.vapi.apiKey || !appConfig.vapi.outboundPhoneNumberId || !appConfig.supabase.hasServiceRole) {
      throw new Error('Outbound campaign routing is not fully configured.');
    }

    const preview = parseBlastCsv(payload.csvText);

    if (!preview.validRecipients.length) {
      return NextResponse.json(
        {
          error: 'No valid phone numbers were found in the uploaded CSV.',
          rejectedRows: preview.rejectedRows,
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const agentResult = await supabase
      .from('agents')
      .select('id, organization_id, name, vapi_assistant_id, config')
      .eq('id', payload.assistantId)
      .eq('organization_id', payload.organizationId)
      .maybeSingle();

    if (agentResult.error || !agentResult.data) {
      throw new Error(agentResult.error?.message ?? 'The selected outbound agent could not be found.');
    }

    const outboundAgent = agentResult.data;
    const resolvedPhoneNumberId = payload.phoneNumberId ?? appConfig.vapi.outboundPhoneNumberId;
    const sourceAssistantId = outboundAgent.vapi_assistant_id ?? '';
    const sourceVoice = String(outboundAgent.config?.voiceId ?? appConfig.vapi.defaults.voiceId);

    const campaignAssistant = await createAssistant(
      {
        name: `${payload.campaignName} Broadcast Agent`,
        firstMessage: payload.script,
        model: {
          provider: appConfig.vapi.defaults.modelProvider,
          model: appConfig.vapi.defaults.modelName,
          messages: [
            {
              role: 'system',
              content: [
                'You are a dedicated outbound broadcast agent.',
                'Introduce the business immediately, explain the reason for the outreach, and respect opt-out signals.',
                `Campaign script: ${payload.script}`,
                `Source organization agent: ${outboundAgent.name}`,
                sourceAssistantId ? `Source Vapi assistant: ${sourceAssistantId}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
        voice: {
          provider: appConfig.vapi.defaults.voiceProvider,
          voiceId: payload.voiceLabel || sourceVoice,
          fallbackPlan: {
            voices: [
              {
                provider: appConfig.vapi.defaults.fallbackVoiceProvider,
                voiceId: appConfig.vapi.defaults.fallbackVoiceId,
              },
            ],
          },
        },
      },
      `campaign-assistant-${payload.organizationId}-${payload.campaignName}`,
    );

    const campaign = await createCampaign(
      {
        name: payload.campaignName,
        assistantId: campaignAssistant.id,
        phoneNumberId: resolvedPhoneNumberId,
        customers: preview.validRecipients.map((recipient) => ({
          number: recipient.phoneNumber,
          name: recipient.name,
        })),
      },
      `campaign-${payload.organizationId}-${payload.campaignName}`,
    );

    const campaignInsert = await supabase
      .from('campaigns')
      .insert({
        organization_id: payload.organizationId,
        agent_id: payload.assistantId,
        name: payload.campaignName,
        status: 'active',
        target_filter: {
          acceptedRecipients: preview.validRecipients.length,
          rejectedRecipients: preview.rejectedRows.length,
          vapiCampaignId: campaign.id,
        },
        schedule: {
          launchedAt: new Date().toISOString(),
          phoneNumberId: resolvedPhoneNumberId,
          generatedAssistantId: campaignAssistant.id,
        },
      })
      .select('id')
      .single();

    if (campaignInsert.error || !campaignInsert.data) {
      throw new Error(campaignInsert.error?.message ?? 'Campaign metadata could not be stored.');
    }

    const recipientInsert = await supabase.from('campaign_recipients').insert(
      preview.validRecipients.map((recipient) => ({
        campaign_id: campaignInsert.data.id,
        contact_name: recipient.name,
        phone_number: recipient.phoneNumber,
        row_number: recipient.rowNumber,
        status: 'queued',
      })),
    );

    if (recipientInsert.error) {
      throw new Error(recipientInsert.error.message);
    }

    return NextResponse.json({
      mode: 'live',
      campaignId: campaign.id,
      assistantId: campaignAssistant.id,
      campaignName: payload.campaignName,
      recipientsAccepted: preview.validRecipients.length,
      recipientsRejected: preview.rejectedRows.length,
      warnings: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to launch the blast campaign.',
      },
      { status: 400 },
    );
  }
}
