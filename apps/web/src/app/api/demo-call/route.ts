import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { buildFallbackDemoTemplate, buildVapiAssistantPayload } from '@/lib/demo-template';
import { createAssistant, createOutboundCall } from '@/lib/vapi';

export const runtime = 'nodejs';

const demoTemplateResponseSchema = z.object({
  mode: z.enum(['live', 'fallback']),
  diagnostics: z.array(z.string()),
  orchestrationMode: z.enum(['inbound', 'outbound', 'multi']),
  businessContext: z.object({
    businessName: z.string(),
    vertical: z.string(),
    targetCaller: z.string(),
    summary: z.string(),
  }),
  assistantDraft: z.object({
    name: z.string(),
    firstMessage: z.string(),
    systemPrompt: z.string(),
    leadCaptureFields: z.array(z.string()),
    qualificationChecklist: z.array(z.string()),
    faqSnippets: z.array(z.string()),
    objectionHandling: z.array(z.string()),
    successCriteria: z.array(z.string()),
  }),
  recommendedStack: z.object({
    model: z.object({
      provider: z.string(),
      name: z.string(),
      reason: z.string(),
    }),
    voice: z.object({
      provider: z.string(),
      voiceId: z.string(),
      label: z.string(),
      reason: z.string(),
      fallbackVoices: z.array(
        z.object({
          provider: z.string(),
          voiceId: z.string(),
        }),
      ),
    }),
    telephony: z.object({
      phoneNumberId: z.string().optional(),
      label: z.string(),
      outboundReady: z.boolean(),
    }),
  }),
  mermaidFlowchart: z.string(),
  persistedBlueprintId: z.string().optional(),
});

const demoCallRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  targetPhoneNumber: z.string().min(7),
  assistantId: z.string().optional(),
  template: demoTemplateResponseSchema.optional(),
});

function normalizePhoneNumber(input: string) {
  const digits = input.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return digits;
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the platform admin can launch live demo calls.' }, { status: 403 });
    }

    const payload = demoCallRequestSchema.parse(await request.json());
    const normalizedPhone = normalizePhoneNumber(payload.targetPhoneNumber);
    const template = payload.template ?? buildFallbackDemoTemplate({});

    if (!appConfig.vapi.apiKey || !appConfig.vapi.demoPhoneNumberId) {
      throw new Error('Live demo calling requires VAPI_API_KEY and VAPI_DEMO_PHONE_NUMBER_ID.');
    }

    const assistantId =
      payload.assistantId ??
      (
        await createAssistant(
          buildVapiAssistantPayload(template),
          `assistant-${template.businessContext.businessName}-${normalizedPhone}`,
        )
      ).id;

    const call = await createOutboundCall(
      {
        assistantId,
        phoneNumberId: appConfig.vapi.demoPhoneNumberId,
        customer: {
          number: normalizedPhone,
        },
      },
      `call-${assistantId}-${normalizedPhone}`,
    );

    return NextResponse.json({
      mode: 'live',
      message: `Assistant ${assistantId} was created under the shared Vapi account and the demo call was launched to ${normalizedPhone}.`,
      assistantId,
      callId: call.id,
      phoneNumberId: appConfig.vapi.demoPhoneNumberId,
      warnings: template.mode === 'fallback' ? ['The assistant template came from the local fallback generator.'] : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create the Vapi demo call.',
      },
      { status: 400 },
    );
  }
}
