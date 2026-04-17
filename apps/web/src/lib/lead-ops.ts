import { randomUUID } from 'node:crypto';

import { appConfig } from '@/lib/app-config';
import { getIcpTemplatePack } from '@/lib/icp-packs';
import type { LeadEnrichmentRun, LeadRecoveryRun } from '@/lib/voiceops-contracts';

type RecoveryInput = {
  organizationId?: string;
  callId?: string;
  leadId?: string;
  icpPackId?: string;
  transcript: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

type EnrichmentInput = {
  organizationId?: string;
  leadId: string;
  icpPackId?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  service?: string;
  source?: string;
};

type GeminiRecoveryShape = {
  lead: Record<string, unknown>;
  confidence: number;
  missingFields: string[];
  notes: string[];
};

function normalizeConfidence(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }
  }

  return fallback;
}

function firstRegexMatch(source: string, expression: RegExp) {
  return source.match(expression)?.[1]?.trim() ?? '';
}

function extractFallbackLead(input: RecoveryInput) {
  const transcript = input.transcript;
  const icpPack = getIcpTemplatePack(input.icpPackId);
  const phone = firstRegexMatch(transcript, /(?:phone|number|callback)[^+\d]*(\+?[\d\-\(\)\s]{7,})/i).replace(/\s+/g, ' ').trim();
  const email = firstRegexMatch(transcript, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const name = firstRegexMatch(transcript, /(?:my name is|this is|i am)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i);
  const service =
    icpPack.leadSchema.requiredFields.find((field) => field.key.includes('service') || field.key.includes('visit') || field.key.includes('matter'))?.label ??
    'Service inquiry';

  const extractedLead: Record<string, unknown> = {
    name: name || 'Unknown caller',
    phone: phone || undefined,
    email: email || undefined,
    service,
    summary: input.summary ?? transcript.slice(0, 240),
  };

  const missingFields = icpPack.leadSchema.requiredFields
    .filter((field) => {
      const normalizedKey = field.key.replace(/_(name|number|phone)$/i, '');
      if (normalizedKey.includes('name')) {
        return !name;
      }
      if (normalizedKey.includes('phone') || normalizedKey.includes('callback')) {
        return !phone;
      }
      if (normalizedKey.includes('email')) {
        return !email;
      }
      return false;
    })
    .map((field) => field.label);

  const confidence = phone || email ? 0.74 : 0.52;
  const status = confidence >= 0.8 ? 'recovered' : confidence >= 0.6 ? 'partial' : 'needs-review';

  return {
    extractedLead,
    confidence,
    missingFields,
    notes: ['Fallback recovery used transcript heuristics because Gemini was unavailable or returned an invalid payload.'],
    status,
  } as const;
}

async function recoverLeadWithGemini(input: RecoveryInput): Promise<GeminiRecoveryShape | null> {
  if (!appConfig.gemini.apiKey) {
    return null;
  }

  const icpPack = getIcpTemplatePack(input.icpPackId);
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
              text: 'Extract lead data from voice call transcripts. Return valid JSON only. Do not invent fields you do not have evidence for.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  `ICP Pack: ${icpPack.label}`,
                  `Required fields: ${icpPack.leadSchema.requiredFields.map((field) => field.label).join(', ')}`,
                  `Optional fields: ${icpPack.leadSchema.optionalFields.map((field) => field.label).join(', ')}`,
                  `Summary: ${input.summary ?? 'None provided'}`,
                  `Transcript:\n${input.transcript}`,
                  'Return JSON with keys: lead, confidence, missingFields, notes.',
                ].join('\n\n'),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const rawText = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim();

  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText) as GeminiRecoveryShape;
    return {
      lead: parsed.lead ?? {},
      confidence: normalizeConfidence(parsed.confidence, 0.72),
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map(String) : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function recoverLeadFromCall(input: RecoveryInput): Promise<LeadRecoveryRun> {
  const geminiResult = await recoverLeadWithGemini(input);
  const fallback = extractFallbackLead(input);
  const confidence = normalizeConfidence(geminiResult?.confidence, fallback.confidence);
  const missingFields = geminiResult?.missingFields?.length ? geminiResult.missingFields : fallback.missingFields;
  const extractedLead = geminiResult?.lead && Object.keys(geminiResult.lead).length ? geminiResult.lead : fallback.extractedLead;
  const notes = geminiResult?.notes?.length ? geminiResult.notes : fallback.notes;
  const status = confidence >= 0.85 ? 'recovered' : confidence >= 0.62 ? 'partial' : 'needs-review';

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    callId: input.callId,
    leadId: input.leadId,
    icpPackId: input.icpPackId,
    provider: geminiResult ? 'gemini' : 'fallback',
    status,
    confidence,
    missingFields,
    extractedLead,
    notes: [...notes],
    createdAt: new Date().toISOString(),
  };
}

async function enrichWithApify(input: EnrichmentInput) {
  if (!appConfig.apify.apiToken || !appConfig.apify.leadActorId) {
    return null;
  }

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${appConfig.apify.leadActorId}/runs?token=${appConfig.apify.apiToken}&waitForFinish=120`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead: input,
      }),
      cache: 'no-store',
    },
  );

  if (!runResponse.ok) {
    return null;
  }

  const runPayload = await runResponse.json();
  const datasetId = runPayload?.data?.defaultDatasetId;

  if (!datasetId) {
    return null;
  }

  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${appConfig.apify.apiToken}`,
    { cache: 'no-store' },
  );

  if (!datasetResponse.ok) {
    return null;
  }

  const items = (await datasetResponse.json()) as Array<Record<string, unknown>>;
  return items[0] ?? null;
}

export async function enrichLeadRecord(input: EnrichmentInput): Promise<LeadEnrichmentRun> {
  const apifyPayload = await enrichWithApify(input);

  if (apifyPayload) {
    return {
      id: randomUUID(),
      organizationId: input.organizationId,
      leadId: input.leadId,
      provider: 'apify',
      status: 'completed',
      summary: 'Apify enrichment completed for this lead.',
      enrichment: apifyPayload,
      createdAt: new Date().toISOString(),
    };
  }

  const derivedWebsite =
    input.email?.split('@')[1] ??
    (input.company ? `${input.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com` : undefined);

  const fallback = {
    company: input.company ?? input.name ?? 'Unknown business',
    website: derivedWebsite ? `https://${derivedWebsite}` : undefined,
    serviceContext: input.service ?? 'Voice lead',
    confidence: 'Low-confidence fallback enrichment',
    source: input.source ?? 'voice-platform',
  };

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    leadId: input.leadId,
    provider: 'fallback',
    status: derivedWebsite ? 'partial' : 'failed',
    summary: derivedWebsite
      ? 'Fallback enrichment inferred a likely website and service context from the captured lead data.'
      : 'Fallback enrichment could not infer a strong company footprint from the current lead data.',
    enrichment: fallback,
    createdAt: new Date().toISOString(),
  };
}
