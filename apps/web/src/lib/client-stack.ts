import { appConfig } from '@/lib/app-config';
import type { AgentRole, OrchestrationMode } from '@/lib/types';
import type { VapiAssistantPayload } from '@/lib/vapi';
import { buildNaturalFirstMessage, buildNaturalSystemPrompt, naturalDemoVoicePreset } from '@/lib/voice-assistant-template';

type ClientStackInput = {
  businessName: string;
  vertical: string;
  orchestrationMode: OrchestrationMode;
  websiteUrl?: string;
  googleBusinessProfile?: string;
};

type BuiltAssistant = {
  role: AgentRole;
  agentType: AgentRole;
  name: string;
  purpose: string;
  payload: VapiAssistantPayload;
};

function buildPayload(name: string, role: AgentRole, systemPrompt: string): VapiAssistantPayload {
  const businessName = name
    .replace(/ Inbound Concierge$/, '')
    .replace(/ Outbound Campaign Agent$/, '')
    .replace(/ Campaign Broadcast Agent$/, '');

  return {
    name,
    firstMessage: buildNaturalFirstMessage({
      businessName,
      role,
    }),
    model: {
      provider: appConfig.vapi.defaults.modelProvider,
      model: appConfig.vapi.defaults.modelName,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    },
    voice: {
      provider: naturalDemoVoicePreset.provider,
      voiceId: naturalDemoVoicePreset.voiceId,
      fallbackPlan: {
        voices: [...naturalDemoVoicePreset.fallbackVoices],
      },
    },
  };
}

export function buildClientAssistantDefinitions(input: ClientStackInput): BuiltAssistant[] {
  const names = {
    inbound: `${input.businessName} Inbound Concierge`,
    outbound: `${input.businessName} Outbound Campaign Agent`,
    campaign: `${input.businessName} Campaign Broadcast Agent`,
  } as const;

  return [
    {
      role: 'inbound',
      agentType: 'inbound',
      name: names.inbound,
      purpose: 'Inbound calls, lead capture, FAQs, and booking qualification.',
      payload: buildPayload(
        names.inbound,
        'inbound',
        buildNaturalSystemPrompt({
          businessName: input.businessName,
          role: 'inbound',
          vertical: input.vertical,
          summary: 'Handle inbound lead capture, qualification, FAQs, and booking intent.',
          targetCaller: 'callers who need answers, booking, or a message',
          orchestrationMode: input.orchestrationMode,
        }),
      ),
    },
    {
      role: 'outbound',
      agentType: 'outbound',
      name: names.outbound,
      purpose: 'Blast calls, follow-ups, reminders, and reactivation campaigns.',
      payload: buildPayload(
        names.outbound,
        'outbound',
        buildNaturalSystemPrompt({
          businessName: input.businessName,
          role: 'outbound',
          vertical: input.vertical,
          summary: 'Warm follow-ups, reminders, reactivation callbacks, and one-to-one outbound touchpoints.',
          targetCaller: 'warm lead, callback recipient, or reactivation contact',
          orchestrationMode: input.orchestrationMode,
        }),
      ),
    },
    {
      role: 'campaign',
      agentType: 'campaign',
      name: names.campaign,
      purpose: 'Dedicated assistant ID for script-driven blast campaigns and outbound list sends.',
      payload: buildPayload(
        names.campaign,
        'campaign',
        buildNaturalSystemPrompt({
          businessName: input.businessName,
          role: 'campaign',
          vertical: input.vertical,
          summary: 'List-based campaigns, promotions, reminders, reactivation, and script-driven outbound blasts.',
          targetCaller: 'campaign recipient',
          orchestrationMode: input.orchestrationMode,
        }),
      ),
    },
  ];
}
