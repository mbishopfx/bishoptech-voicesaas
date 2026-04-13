import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canManageOrganization, getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { parseBlastCsv } from '@/lib/csv';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { enqueueWorkerJob } from '@/lib/worker-queue';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

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

    if (!appConfig.supabase.hasServiceRole) {
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
    const credentials = await resolveVapiCredentialsForOrganization(payload.organizationId);

    if (!resolvedPhoneNumberId) {
      throw new Error('No outbound phone number is configured for this campaign.');
    }

    const campaignInsert = await supabase
      .from('campaigns')
      .insert({
        organization_id: payload.organizationId,
        agent_id: payload.assistantId,
        name: payload.campaignName,
        status: 'queued',
        target_filter: {
          acceptedRecipients: preview.validRecipients.length,
          rejectedRecipients: preview.rejectedRows.length,
        },
        schedule: {
          queuedAt: new Date().toISOString(),
          phoneNumberId: resolvedPhoneNumberId,
          queue: 'campaign-dispatch',
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

    await enqueueWorkerJob({
      queueName: 'campaign-dispatch',
      jobType: 'campaign.launch',
      organizationId: payload.organizationId,
      idempotencyKey: `campaign-launch-${campaignInsert.data.id}`,
      payload: {
        campaignRecordId: campaignInsert.data.id,
        organizationId: payload.organizationId,
        campaignName: payload.campaignName,
        sourceAgentId: payload.assistantId,
        sourceAgentName: outboundAgent.name,
        sourceVapiAssistantId: outboundAgent.vapi_assistant_id ?? null,
        script: payload.script,
        phoneNumberId: resolvedPhoneNumberId,
        voiceLabel: payload.voiceLabel ?? null,
        recipientsAccepted: preview.validRecipients.length,
        recipientsRejected: preview.rejectedRows.length,
        vapiApiKey: credentials.apiKey,
      },
    });

    return NextResponse.json({
      mode: 'queued',
      campaignId: campaignInsert.data.id,
      campaignName: payload.campaignName,
      recipientsAccepted: preview.validRecipients.length,
      recipientsRejected: preview.rejectedRows.length,
      warnings: ['Campaign accepted and queued for Railway worker dispatch.'],
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
