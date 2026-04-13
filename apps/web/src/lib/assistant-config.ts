import { appConfig } from '@/lib/app-config';
import type { VapiAssistantPayload } from '@/lib/vapi';

export type VapiAccountMode = 'managed' | 'byo';
export type AssistantSyncStatus = 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';

export type AssistantConfigSnapshot = {
  accountMode: VapiAccountMode;
  syncStatus: AssistantSyncStatus;
  draftPayload: VapiAssistantPayload;
  livePayload: VapiAssistantPayload;
  lastError?: string | null;
  lastPublishedAt?: string | null;
  lastSyncedAt?: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeDeep<T extends UnknownRecord>(base: T, overlay: UnknownRecord | null | undefined): T {
  if (!isRecord(overlay)) {
    return deepClone(base);
  }

  const output: UnknownRecord = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (Array.isArray(value)) {
      output[key] = deepClone(value);
      continue;
    }

    if (isRecord(value) && isRecord((base as UnknownRecord)[key])) {
      output[key] = mergeDeep(base[key] as UnknownRecord, value);
      continue;
    }

    output[key] = deepClone(value);
  }

  return output as T;
}

function normalizePayload(payload: UnknownRecord | null | undefined, fallbackName = 'Assistant'): VapiAssistantPayload {
  const base: VapiAssistantPayload = {
    name: fallbackName,
    firstMessage: '',
    model: {
      provider: appConfig.vapi.defaults.modelProvider,
      model: appConfig.vapi.defaults.modelName,
      messages: [
        {
          role: 'system',
          content: '',
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
    tools: [],
  };

  if (!isRecord(payload)) {
    return base;
  }

  const merged = mergeDeep(base, payload);

  if (!Array.isArray(merged.model.messages) || !merged.model.messages.length) {
    merged.model.messages = [
      {
        role: 'system',
        content: '',
      },
    ];
  }

  if (!merged.voice.fallbackPlan) {
    merged.voice.fallbackPlan = {
      voices: [
        {
          provider: appConfig.vapi.defaults.fallbackVoiceProvider,
          voiceId: appConfig.vapi.defaults.fallbackVoiceId,
        },
      ],
    };
  }

  if (!Array.isArray(merged.tools)) {
    merged.tools = [];
  }

  return merged;
}

export function normalizeAssistantConfig(config: unknown, fallbackName = 'Assistant'): AssistantConfigSnapshot {
  const record = isRecord(config) ? config : {};
  const draftPayload = normalizePayload(
    (record.vapiDraftPayload as UnknownRecord | undefined) ?? (record.vapiPayload as UnknownRecord | undefined),
    fallbackName,
  );
  const livePayload = normalizePayload(
    (record.vapiLivePayload as UnknownRecord | undefined) ?? (record.vapiPayload as UnknownRecord | undefined),
    fallbackName,
  );

  return {
    accountMode: record.accountMode === 'byo' ? 'byo' : 'managed',
    syncStatus:
      record.syncStatus === 'synced' ||
      record.syncStatus === 'draft' ||
      record.syncStatus === 'dirty' ||
      record.syncStatus === 'error'
        ? record.syncStatus
        : 'unknown',
    draftPayload,
    livePayload,
    lastError: typeof record.lastError === 'string' ? record.lastError : null,
    lastPublishedAt: typeof record.lastPublishedAt === 'string' ? record.lastPublishedAt : null,
    lastSyncedAt: typeof record.lastSyncedAt === 'string' ? record.lastSyncedAt : null,
  };
}

export function buildAssistantConfigSnapshot(
  draftPayload: VapiAssistantPayload,
  options: {
    accountMode?: VapiAccountMode;
    syncStatus?: AssistantSyncStatus;
    livePayload?: VapiAssistantPayload;
    lastError?: string | null;
    lastPublishedAt?: string | null;
    lastSyncedAt?: string | null;
  } = {},
): AssistantConfigSnapshot {
  return {
    accountMode: options.accountMode ?? 'managed',
    syncStatus: options.syncStatus ?? 'draft',
    draftPayload: deepClone(draftPayload),
    livePayload: deepClone(options.livePayload ?? draftPayload),
    lastError: options.lastError ?? null,
    lastPublishedAt: options.lastPublishedAt ?? null,
    lastSyncedAt: options.lastSyncedAt ?? null,
  };
}

export function mergeAssistantPayload(
  basePayload: VapiAssistantPayload,
  overlay: VapiAssistantPayload,
): VapiAssistantPayload {
  return mergeDeep(basePayload as UnknownRecord, overlay as UnknownRecord) as VapiAssistantPayload;
}

export function getSystemMessage(payload: VapiAssistantPayload) {
  return payload.model.messages.find((message) => message.role === 'system')?.content ?? '';
}

export function setSystemMessage(payload: VapiAssistantPayload, content: string) {
  const nextPayload = deepClone(payload);
  const index = nextPayload.model.messages.findIndex((message) => message.role === 'system');

  if (index >= 0) {
    nextPayload.model.messages[index] = { ...nextPayload.model.messages[index], content };
  } else {
    nextPayload.model.messages.unshift({ role: 'system', content });
  }

  return nextPayload;
}

export function setFirstMessage(payload: VapiAssistantPayload, firstMessage: string) {
  return {
    ...deepClone(payload),
    firstMessage,
  } satisfies VapiAssistantPayload;
}
