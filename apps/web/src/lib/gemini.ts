import { z } from 'zod';

import { appConfig } from '@/lib/app-config';
import { buildFallbackDemoTemplate } from '@/lib/demo-template';
import type { DemoTemplateInput, DemoTemplateResult } from '@/lib/types';

const geminiTemplateSchema = z.object({
  businessSummary: z.string(),
  assistantName: z.string(),
  firstMessage: z.string(),
  systemPrompt: z.string(),
  leadCaptureFields: z.array(z.string()).min(3),
  qualificationChecklist: z.array(z.string()).min(3),
  faqSnippets: z.array(z.string()).min(3),
  objectionHandling: z.array(z.string()).min(3),
  successCriteria: z.array(z.string()).min(3),
  targetCaller: z.string(),
  vertical: z.string(),
  workflowSteps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
    }),
  ).min(4),
});

function extractTextFromGemini(payload: any) {
  return payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
}

function buildMermaidFromWorkflow(
  businessName: string,
  steps: Array<{ id: string; title: string; detail: string }>,
) {
  const lines = ['flowchart LR'];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const next = steps[index + 1];
    lines.push(`${step.id}["${step.title}: ${step.detail}"]`);
    if (next) {
      lines.push(`${step.id} --> ${next.id}`);
    }
  }

  lines.unshift(`%% Workflow demo for ${businessName}`);
  return lines.join('\n');
}

export async function generateDemoTemplate(input: DemoTemplateInput): Promise<DemoTemplateResult> {
  if (!appConfig.gemini.apiKey) {
    return buildFallbackDemoTemplate(input, ['Gemini is not configured, so the platform generated a fallback prompt pack locally.']);
  }

  const businessName = input.businessName?.trim() || 'Demo Business';
  const orchestrationMode = input.orchestrationMode ?? 'multi';
  const prompt = [
    `Business name: ${businessName}`,
    `Website URL: ${input.websiteUrl || 'Not provided'}`,
    `Goal for the demo: ${input.goal || 'Show a realistic inbound lead capture flow and immediate demo call.'}`,
    `Topology: ${orchestrationMode}`,
    'Raw Google Business Profile text:',
    input.googleBusinessProfile || 'Not provided',
    'Additional notes:',
    input.notes || 'None',
    '',
    'Create a production-grade voice assistant demo template for Vapi.',
    'Return JSON only.',
    'The assistant should sound like a real front desk, use short spoken phrases, qualify leads fast, and be safe for client demos.',
    'Assume the model must prioritize low latency and realistic voice quality.',
    'workflowSteps should use short IDs like A, B, C, D.',
  ].join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${appConfig.gemini.model}:generateContent?key=${appConfig.gemini.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'You design high-performing voice assistant demo templates for service businesses. Output strict JSON only.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
        },
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return buildFallbackDemoTemplate(input, [
      `Gemini returned ${response.status}. Falling back to a locally generated prompt pack.`,
    ]);
  }

  const rawPayload = await response.json();
  const rawText = extractTextFromGemini(rawPayload);

  if (!rawText) {
    return buildFallbackDemoTemplate(input, ['Gemini returned an empty payload. Falling back to a local template.']);
  }

  const parsed = geminiTemplateSchema.safeParse(JSON.parse(rawText));

  if (!parsed.success) {
    return buildFallbackDemoTemplate(input, ['Gemini returned JSON, but it did not match the expected demo template contract.']);
  }

  const data = parsed.data;

  return {
    mode: 'live',
    diagnostics: [],
    orchestrationMode,
    businessContext: {
      businessName,
      vertical: data.vertical,
      targetCaller: data.targetCaller,
      summary: data.businessSummary,
    },
    assistantDraft: {
      name: data.assistantName,
      firstMessage: data.firstMessage,
      systemPrompt: data.systemPrompt,
      leadCaptureFields: data.leadCaptureFields,
      qualificationChecklist: data.qualificationChecklist,
      faqSnippets: data.faqSnippets,
      objectionHandling: data.objectionHandling,
      successCriteria: data.successCriteria,
    },
    recommendedStack: {
      model: {
        provider: appConfig.vapi.defaults.modelProvider,
        name: appConfig.vapi.defaults.modelName,
        reason: 'Pinned to the default low-latency production stack configured for live Vapi demos.',
      },
      voice: {
        provider: appConfig.vapi.defaults.voiceProvider,
        voiceId: appConfig.vapi.defaults.voiceId,
        label: 'Primary demo voice',
        reason: 'Configured as the default realistic voice for demos, with a fallback voice baked in.',
        fallbackVoices: [
          {
            provider: appConfig.vapi.defaults.fallbackVoiceProvider,
            voiceId: appConfig.vapi.defaults.fallbackVoiceId,
          },
        ],
      },
      telephony: {
        phoneNumberId: appConfig.vapi.demoPhoneNumberId,
        label: appConfig.vapi.demoNumberLabel,
        outboundReady: Boolean(appConfig.vapi.demoPhoneNumberId),
      },
    },
    mermaidFlowchart: buildMermaidFromWorkflow(businessName, data.workflowSteps),
  };
}
