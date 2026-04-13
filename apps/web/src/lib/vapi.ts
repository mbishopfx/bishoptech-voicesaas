import { appConfig } from '@/lib/app-config';

type VapiFetchOptions = {
  idempotencyKey?: string;
  apiKey?: string;
};

export type VapiAssistantPayload = {
  name: string;
  firstMessage?: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{
      role: 'system' | 'assistant' | 'user';
      content: string;
    }>;
    [key: string]: unknown;
  };
  voice: {
    provider: string;
    voiceId: string;
    fallbackPlan?: {
      voices: Array<{
        provider: string;
        voiceId: string;
      }>;
    };
    [key: string]: unknown;
  };
  server?: {
    url?: string;
    timeoutSeconds?: number;
    message?: unknown;
    [key: string]: unknown;
  };
  tools?: Array<Record<string, unknown>>;
  knowledgeBase?: Record<string, unknown>;
  credentialIds?: string[];
  hooks?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type VapiAssistantRecord = VapiAssistantPayload & {
  id: string;
  orgId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type VapiCreateCallPayload = {
  assistantId: string;
  phoneNumberId?: string;
  customer: {
    number: string;
  };
};

export type VapiSquadPayload = {
  name: string;
  members: Array<{
    assistantId: string;
  }>;
};

export type VapiCampaignPayload = {
  name: string;
  assistantId: string;
  phoneNumberId?: string;
  customers: Array<{
    number: string;
    name?: string;
  }>;
};

function assertVapiConfigured() {
  if (!appConfig.vapi.apiKey) {
    throw new Error('Missing VAPI_API_KEY');
  }
}

export async function vapiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: VapiFetchOptions = {},
) {
  const apiKey = options.apiKey ?? appConfig.vapi.apiKey;

  if (!apiKey) {
    assertVapiConfigured();
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const res = await fetch(`${appConfig.vapi.baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Vapi API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export async function createAssistant(payload: VapiAssistantPayload, idempotencyKey?: string, apiKey?: string) {
  return vapiFetch<{ id: string }>('/assistant', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}

export async function getAssistant(assistantId: string, apiKey?: string) {
  return vapiFetch<VapiAssistantRecord>(`/assistant/${assistantId}`, {
    method: 'GET',
  }, { apiKey });
}

export async function updateAssistant(
  assistantId: string,
  payload: VapiAssistantPayload,
  idempotencyKey?: string,
  apiKey?: string,
) {
  return vapiFetch<VapiAssistantRecord>(`/assistant/${assistantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}

export async function createOutboundCall(payload: VapiCreateCallPayload, idempotencyKey?: string, apiKey?: string) {
  return vapiFetch<{ id: string }>('/call', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}

export async function createSquad(payload: VapiSquadPayload, idempotencyKey?: string, apiKey?: string) {
  return vapiFetch<{ id: string }>('/squad', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}

export async function createCampaign(payload: VapiCampaignPayload, idempotencyKey?: string, apiKey?: string) {
  return vapiFetch<{ id: string }>('/campaign', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}
