import personaData from '@/data/homepage-personas.json';

export type HomepagePersonaRole = 'inbound' | 'outbound';

export type HomepagePersona = {
  slug: string;
  role: HomepagePersonaRole;
  name: string;
  headline: string;
  tone: string;
  preview: string;
  firstMessage: string;
  voiceId: string;
  fallbackVoiceId: string;
  assistantId: string;
  systemPrompt: string;
};

export const homepagePersonas = personaData as HomepagePersona[];

export function getHomepagePersonaGroups() {
  return {
    inbound: homepagePersonas.filter((persona) => persona.role === 'inbound'),
    outbound: homepagePersonas.filter((persona) => persona.role === 'outbound'),
  };
}
