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
    .replace(/ Specialist Handoff Agent$/, '');

  return {
    name,
    firstMessage:
      role === 'outbound'
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
    specialist: `${input.businessName} Specialist Handoff Agent`,
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
    'Role: outbound campaign agent.',
    'This assistant is used for blast campaigns, follow-up calls, reminders, and reactivation lists.',
    'Keep the opening concise, identify the business immediately, and state the reason for the call clearly.',
    'Collect opt-out and callback intent without sounding robotic.',
  ].join('\n\n');

  const specialistPrompt = [
    context,
    'Role: specialist AI handoff agent.',
    'Take over when the inbound assistant hits a complex objection, advanced service question, or high-intent sales conversation.',
    'Use a more expert tone and deeper scoped knowledge than the inbound receptionist assistant.',
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
      role: 'specialist',
      agentType: 'specialist',
      name: names.specialist,
      purpose: 'AI handoff target for advanced objections or higher-intent conversations.',
      payload: buildPayload(names.specialist, 'specialist', specialistPrompt),
    },
  ];
}
