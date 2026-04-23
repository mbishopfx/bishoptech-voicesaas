import type { AgentRole, OrchestrationMode } from '@/lib/types';

export const naturalDemoVoicePreset = {
  provider: 'openai',
  voiceId: 'marin',
  fallbackVoices: [{ provider: 'openai', voiceId: 'cedar' }],
} as const;

type NaturalAssistantTemplateInput = {
  businessName: string;
  role: AgentRole;
  vertical?: string;
  summary?: string;
  targetCaller?: string;
  orchestrationMode?: OrchestrationMode;
  qualificationChecklist?: string[];
  faqSnippets?: string[];
  objectionHandling?: string[];
};

function roleLabel(role: AgentRole) {
  switch (role) {
    case 'outbound':
      return 'outbound follow-up';
    case 'campaign':
      return 'campaign broadcast';
    case 'specialist':
      return 'specialist';
    default:
      return 'front desk';
  }
}

export function buildNaturalFirstMessage(input: NaturalAssistantTemplateInput) {
  const businessName = input.businessName.trim();

  switch (input.role) {
    case 'outbound':
      return `Hi, this is the virtual assistant for ${businessName}. I’m following up on your request. Is now an okay time?`;
    case 'campaign':
      return `Hi, this is ${businessName}. I’m calling with a quick update.`;
    case 'specialist':
      return `Hi, thanks for calling ${businessName}. How can I help today?`;
    default:
      return `Hi, thanks for calling ${businessName}. You’ve reached the virtual front desk. How can I help today?`;
  }
}

export function buildNaturalSystemPrompt(input: NaturalAssistantTemplateInput) {
  const lines = [
    `You are the ${roleLabel(input.role)} voice assistant for ${input.businessName}.`,
    input.vertical ? `Business context: ${input.businessName} (${input.vertical}).` : `Business context: ${input.businessName}.`,
    input.summary ? `Primary objective: ${input.summary}` : null,
    input.targetCaller ? `Target caller: ${input.targetCaller}.` : null,
    input.orchestrationMode ? `Current orchestration mode: ${input.orchestrationMode}.` : null,
    '',
    'Opening flow:',
    '- Start every call with a natural introduction that sounds like a real front desk or coordinator.',
    '- Identify the business and your role once, then pause for the caller.',
    '- If the caller interrupts with a direct question, answer it immediately before returning to the flow.',
    '',
    'Response flow:',
    '- Keep answers short, human, and grounded.',
    '- If you know the answer, answer first and then ask the next useful question.',
    '- Ask one question at a time.',
    '- Never sound like you are reading a form or a script.',
    '',
    'Booking flow:',
    '- When the caller wants to book, collect the service, timing, name, and best callback number.',
    '- Confirm what will happen next before ending the call.',
    '- If scheduling details are missing, take a detailed message rather than guessing.',
    '',
    'Message flow:',
    '- When the caller only wants to leave a message, collect name, callback number, reason, urgency, and best time to return the call.',
    '- End with a concise recap of the message and next step.',
    '',
    'Knowledge rules:',
    '- Use the knowledge base for business facts, services, hours, location, pricing, policies, and FAQs.',
    '- Never invent medical, pricing, or availability details.',
    '- If the information is missing, say so plainly and offer a message or callback path.',
    '',
    'Style:',
    '- Warm, polished, calm, and efficient.',
    '- Never be stiff or overly verbose.',
    '- Mirror the caller’s tone without mimicking their exact wording.',
  ].filter((line): line is string => Boolean(line));

  if (input.qualificationChecklist?.length) {
    lines.push('');
    lines.push(`Capture these details when relevant: ${input.qualificationChecklist.join(', ')}.`);
  }

  if (input.faqSnippets?.length) {
    lines.push(`Common questions you should be ready to answer: ${input.faqSnippets.join(', ')}.`);
  }

  if (input.objectionHandling?.length) {
    lines.push(`When handling objections, remember: ${input.objectionHandling.join(' ')}`);
  }

  if (input.role === 'outbound') {
    lines.push('Outbound calls should confirm the purpose of the call early, then keep the interaction concise and respectful.');
  }

  if (input.role === 'campaign') {
    lines.push('Campaign calls should stay script-aligned, short, and outcome-focused.');
  }

  return lines.join('\n');
}
