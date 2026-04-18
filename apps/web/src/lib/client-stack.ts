import { appConfig } from '@/lib/app-config';
import type { AgentRole, OrchestrationMode } from '@/lib/types';
import type { VapiAssistantPayload } from '@/lib/vapi';

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

function buildBaseContext(input: ClientStackInput) {
  return [
    `Business: ${input.businessName}`,
    `Vertical: ${input.vertical}`,
    input.websiteUrl ? `Website: ${input.websiteUrl}` : null,
    input.googleBusinessProfile ? `Google Business Profile:\n${input.googleBusinessProfile}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPayload(name: string, role: AgentRole, systemPrompt: string): VapiAssistantPayload {
  const businessName = name
    .replace(/ Inbound Concierge$/, '')
    .replace(/ Outbound Campaign Agent$/, '')
    .replace(/ Campaign Broadcast Agent$/, '');

  return {
    name,
    firstMessage:
      role === 'outbound' || role === 'campaign'
        ? `Hi, this is the outreach assistant for ${businessName}. I wanted to quickly follow up with you today.`
        : `Thanks for calling ${businessName}. How can I help today?`,
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
      provider: appConfig.vapi.defaults.voiceProvider,
      voiceId: appConfig.vapi.defaults.voiceId,
      fallbackPlan: {
        voices: [
          {
            provider: appConfig.vapi.defaults.fallbackVoiceProvider,
            voiceId: appConfig.vapi.defaults.fallbackVoiceId,
          },
        ],
      },
    },
  };
}

export function buildClientAssistantDefinitions(input: ClientStackInput): BuiltAssistant[] {
  const context = buildBaseContext(input);
  const names = {
    inbound: `${input.businessName} Inbound Concierge`,
    outbound: `${input.businessName} Outbound Campaign Agent`,
    campaign: `${input.businessName} Campaign Broadcast Agent`,
  } as const;

  const inboundPrompt = [
    context,
    'Role: inbound front-desk assistant.',
    'Handle inbound lead capture, qualification, FAQs, and booking intent.',
    'If the caller needs deeper product or case expertise, hand off to the specialist AI agent.',
    `Current routing mode: ${input.orchestrationMode}.`,
  ].join('\n\n');

  const outboundPrompt = [
    context,
    'Role: outbound follow-up agent.',
    'This assistant is used for warm follow-ups, reminders, reactivation callbacks, and one-to-one outbound touchpoints.',
    'Keep the opening concise, identify the business immediately, and confirm the purpose of the call early.',
    'Collect callback intent, booking intent, and opt-out intent without sounding robotic.',
  ].join('\n\n');

  const campaignPrompt = [
    context,
    'Role: campaign broadcast agent.',
    'This assistant powers list-based campaigns, promotions, reminders, reactivation, and script-driven outbound blasts.',
    'The campaign script passed at launch should override the opening and CTA structure for each blast.',
    'Keep responses short, compliant, and outcome-focused.',
  ].join('\n\n');

  return [
    {
      role: 'inbound',
      agentType: 'inbound',
      name: names.inbound,
      purpose: 'Inbound calls, lead capture, FAQs, and booking qualification.',
      payload: buildPayload(names.inbound, 'inbound', inboundPrompt),
    },
    {
      role: 'outbound',
      agentType: 'outbound',
      name: names.outbound,
      purpose: 'Blast calls, follow-ups, reminders, and reactivation campaigns.',
      payload: buildPayload(names.outbound, 'outbound', outboundPrompt),
    },
    {
      role: 'campaign',
      agentType: 'campaign',
      name: names.campaign,
      purpose: 'Dedicated assistant ID for script-driven blast campaigns and outbound list sends.',
      payload: buildPayload(names.campaign, 'campaign', campaignPrompt),
    },
  ];
}
