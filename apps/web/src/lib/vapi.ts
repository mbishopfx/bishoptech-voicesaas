import { appConfig } from '@/lib/app-config';
import fs from 'node:fs/promises';
import path from 'node:path';

type VapiFetchOptions = {
  idempotencyKey?: string;
  apiKey?: string;
};

type VapiListOptions = {
  limit?: number;
  createdAtGe?: string;
  createdAtGt?: string;
  updatedAtGe?: string;
  updatedAtGt?: string;
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

export type VapiPhoneNumberRecord = {
  id: string;
  number?: string;
  name?: string;
  assistantId?: string;
  workflowId?: string;
  orgId?: string;
  status?: string;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type VapiCallRecord = {
  id: string;
  assistantId?: string;
  orgId?: string;
  customer?: {
    number?: string;
    name?: string;
  };
  phoneNumber?: {
    number?: string;
  };
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  duration?: number;
  status?: string;
  endedReason?: string;
  cost?: number;
  artifact?: Record<string, unknown>;
  transcript?: unknown;
  analysis?: Record<string, unknown>;
  [key: string]: unknown;
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

export type VapiFileRecord = {
  id: string;
  name?: string;
  filename?: string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type VapiKnowledgeBaseConfig = {
  provider: 'google';
  name: string;
  description: string;
  fileIds: string[];
};

export type VapiQueryToolPayload = {
  type: 'query';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  knowledgeBases: VapiKnowledgeBaseConfig[];
};

export type VapiAnalyticsQuery = {
  name: string;
  table: 'call' | string;
  timeRange?: {
    start: string;
    end: string;
    step?: 'hour' | 'day' | 'week' | string;
    timezone?: string;
  };
  operations: Array<Record<string, unknown>>;
  filters?: Array<Record<string, unknown>>;
  groupBy?: Array<Record<string, unknown>>;
};

export type VapiAnalyticsResult = {
  name: string;
  timeRange?: {
    start: string;
    end: string;
    step?: string;
    timezone?: string;
  };
  result: Array<Record<string, unknown>>;
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

function buildListQuery(options: VapiListOptions = {}) {
  const params = new URLSearchParams();

  if (typeof options.limit === 'number') {
    params.set('limit', String(options.limit));
  }

  if (options.createdAtGe) {
    params.set('createdAtGe', options.createdAtGe);
  }

  if (options.createdAtGt) {
    params.set('createdAtGt', options.createdAtGt);
  }

  if (options.updatedAtGe) {
    params.set('updatedAtGe', options.updatedAtGe);
  }

  if (options.updatedAtGt) {
    params.set('updatedAtGt', options.updatedAtGt);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
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

export async function listAssistants(options: VapiListOptions = {}, apiKey?: string) {
  return vapiFetch<VapiAssistantRecord[]>(`/assistant${buildListQuery(options)}`, {
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

export async function listCalls(options: VapiListOptions = {}, apiKey?: string) {
  return vapiFetch<VapiCallRecord[]>(`/call${buildListQuery(options)}`, {
    method: 'GET',
  }, { apiKey });
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

export async function listPhoneNumbers(options: VapiListOptions = {}, apiKey?: string) {
  return vapiFetch<VapiPhoneNumberRecord[]>(`/phone-number${buildListQuery(options)}`, {
    method: 'GET',
  }, { apiKey });
}

export async function uploadVapiFile(filePath: string, apiKey?: string) {
  const resolvedApiKey = apiKey ?? appConfig.vapi.apiKey;

  if (!resolvedApiKey) {
    assertVapiConfigured();
  }

  const file = await fs.readFile(filePath);
  const form = new FormData();
  form.set('file', new Blob([file]), path.basename(filePath));

  const response = await fetch(`${appConfig.vapi.baseUrl}/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
    },
    body: form,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vapi file upload error ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<VapiFileRecord>;
}

export async function createQueryTool(payload: VapiQueryToolPayload, idempotencyKey?: string, apiKey?: string) {
  return vapiFetch<{ id: string }>('/tool', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { idempotencyKey, apiKey });
}

export async function runAnalyticsQueries(queries: VapiAnalyticsQuery[], apiKey?: string) {
  return vapiFetch<VapiAnalyticsResult[]>('/analytics', {
    method: 'POST',
    body: JSON.stringify({ queries }),
  }, { apiKey });
}
