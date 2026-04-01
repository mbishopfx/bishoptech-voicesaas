import { z } from 'zod';

import type { IntegrationAvailability } from '@/lib/types';

const envSchema = z.object({
  APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  VAPI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().optional(),
  VAPI_BASE_URL: z.string().url().default('https://api.vapi.ai'),
  VAPI_DEMO_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_OUTBOUND_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_DEMO_NUMBER_LABEL: z.string().default('Primary demo line'),
  VAPI_DEFAULT_MODEL_PROVIDER: z.string().default('openai'),
  VAPI_DEFAULT_MODEL_NAME: z.string().default('gpt-realtime-2025-08-28'),
  VAPI_DEFAULT_VOICE_PROVIDER: z.string().default('openai'),
  VAPI_DEFAULT_VOICE_ID: z.string().default('cedar'),
  VAPI_FALLBACK_VOICE_PROVIDER: z.string().default('openai'),
  VAPI_FALLBACK_VOICE_ID: z.string().default('marin'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default('grok-4-latest'),
});

const parsedEnv = envSchema.parse({
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  VAPI_API_KEY: process.env.VAPI_API_KEY || undefined,
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || undefined,
  VAPI_BASE_URL: process.env.VAPI_BASE_URL ?? 'https://api.vapi.ai',
  VAPI_DEMO_PHONE_NUMBER_ID: process.env.VAPI_DEMO_PHONE_NUMBER_ID || undefined,
  VAPI_OUTBOUND_PHONE_NUMBER_ID: process.env.VAPI_OUTBOUND_PHONE_NUMBER_ID || undefined,
  VAPI_DEMO_NUMBER_LABEL: process.env.VAPI_DEMO_NUMBER_LABEL ?? 'Primary demo line',
  VAPI_DEFAULT_MODEL_PROVIDER: process.env.VAPI_DEFAULT_MODEL_PROVIDER ?? 'openai',
  VAPI_DEFAULT_MODEL_NAME: process.env.VAPI_DEFAULT_MODEL_NAME ?? 'gpt-realtime-2025-08-28',
  VAPI_DEFAULT_VOICE_PROVIDER: process.env.VAPI_DEFAULT_VOICE_PROVIDER ?? 'openai',
  VAPI_DEFAULT_VOICE_ID: process.env.VAPI_DEFAULT_VOICE_ID ?? 'cedar',
  VAPI_FALLBACK_VOICE_PROVIDER: process.env.VAPI_FALLBACK_VOICE_PROVIDER ?? 'openai',
  VAPI_FALLBACK_VOICE_ID: process.env.VAPI_FALLBACK_VOICE_ID ?? 'marin',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  XAI_API_KEY: process.env.XAI_API_KEY || undefined,
  XAI_MODEL: process.env.XAI_MODEL ?? 'grok-4-latest',
});

export const appConfig = {
  appUrl: parsedEnv.APP_URL,
  supabase: {
    url: parsedEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      parsedEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      parsedEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      parsedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: Boolean(parsedEnv.SUPABASE_SERVICE_ROLE_KEY),
  },
  vapi: {
    baseUrl: parsedEnv.VAPI_BASE_URL,
    apiKey: parsedEnv.VAPI_API_KEY,
    publicKey: parsedEnv.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
    demoPhoneNumberId: parsedEnv.VAPI_DEMO_PHONE_NUMBER_ID,
    outboundPhoneNumberId: parsedEnv.VAPI_OUTBOUND_PHONE_NUMBER_ID ?? parsedEnv.VAPI_DEMO_PHONE_NUMBER_ID,
    demoNumberLabel: parsedEnv.VAPI_DEMO_NUMBER_LABEL,
    defaults: {
      modelProvider: parsedEnv.VAPI_DEFAULT_MODEL_PROVIDER,
      modelName: parsedEnv.VAPI_DEFAULT_MODEL_NAME,
      voiceProvider: parsedEnv.VAPI_DEFAULT_VOICE_PROVIDER,
      voiceId: parsedEnv.VAPI_DEFAULT_VOICE_ID,
      fallbackVoiceProvider: parsedEnv.VAPI_FALLBACK_VOICE_PROVIDER,
      fallbackVoiceId: parsedEnv.VAPI_FALLBACK_VOICE_ID,
    },
  },
  gemini: {
    apiKey: parsedEnv.GEMINI_API_KEY,
    model: parsedEnv.GEMINI_MODEL,
  },
  xai: {
    apiKey: parsedEnv.XAI_API_KEY,
    model: parsedEnv.XAI_MODEL,
  },
} as const;

export function getIntegrationAvailability(): IntegrationAvailability[] {
  return [
    {
      label: 'Gemini template generation',
      ready: Boolean(appConfig.gemini.apiKey),
      detail: appConfig.gemini.apiKey
        ? `${appConfig.gemini.model} is ready for raw website + GBP prompt synthesis.`
        : 'Add GEMINI_API_KEY to enable live demo template generation.',
    },
    {
      label: 'Vapi orchestration',
      ready: Boolean(appConfig.vapi.apiKey && appConfig.vapi.demoPhoneNumberId),
      detail: appConfig.vapi.apiKey && appConfig.vapi.demoPhoneNumberId
        ? `Outbound demos will use ${appConfig.vapi.defaults.modelName} on ${appConfig.vapi.demoNumberLabel}.`
        : 'Set VAPI_API_KEY and VAPI_DEMO_PHONE_NUMBER_ID for live assistant creation and call spawning.',
    },
    {
      label: 'Supabase tenancy backbone',
      ready: Boolean(appConfig.supabase.url && appConfig.supabase.anonKey && appConfig.supabase.hasServiceRole),
      detail: appConfig.supabase.url && appConfig.supabase.anonKey && appConfig.supabase.hasServiceRole
        ? 'Auth, RLS, and server-side persistence are configured for the live project.'
        : 'Supabase keys are incomplete, so authenticated organization access cannot be enforced.',
    },
    {
      label: 'Outbound blast routing',
      ready: Boolean(appConfig.vapi.apiKey && appConfig.vapi.outboundPhoneNumberId),
      detail: appConfig.vapi.apiKey && appConfig.vapi.outboundPhoneNumberId
        ? 'CSV-driven outbound campaigns can launch from the dedicated outbound number.'
        : 'Set VAPI_OUTBOUND_PHONE_NUMBER_ID to run blast campaigns from the client portal.',
    },
  ];
}
