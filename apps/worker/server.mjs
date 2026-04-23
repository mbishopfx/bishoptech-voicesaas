import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { createClient } from '@supabase/supabase-js';

const port = Number(process.env.PORT || 8080);
const workerId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || `worker-${randomUUID().slice(0, 8)}`;
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
const batchSize = Number(process.env.WORKER_BATCH_SIZE || 5);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapiApiKey = process.env.VAPI_API_KEY;
const vapiBaseUrl = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
const hasVapi = Boolean(vapiApiKey);
const workerSharedSecret = process.env.WORKER_SHARED_SECRET || '';
const webhookSecret = process.env.VAPI_WEBHOOK_SECRET || '';

const queueState = {
  isDraining: false,
  processedCampaigns: 0,
  processedLeadJobs: 0,
  failedCampaigns: 0,
  receivedWebhooks: 0,
  lastLoopAt: null,
  lastError: null,
};

const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
}

function getRequestSecret(request) {
  return request.headers['x-worker-secret'] || request.headers['authorization']?.replace(/^Bearer\s+/i, '') || '';
}

function isAuthorizedRequest(request) {
  if (!workerSharedSecret) {
    return true;
  }

  return getRequestSecret(request) === workerSharedSecret;
}

function isWebhookAuthorized(request) {
  if (!webhookSecret) {
    return true;
  }

  return request.headers['x-vapi-secret'] === webhookSecret || request.headers['authorization']?.replace(/^Bearer\s+/i, '') === webhookSecret;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

async function readJsonBody(request) {
  const rawBody = await readBody(request);

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase worker environment is not configured.');
  }

  return supabase;
}

function ensureVapi() {
  if (!hasVapi) {
    throw new Error('Vapi API access is not configured on the worker.');
  }
}

function resolveOrganizationId(payload) {
  const candidates = [
    payload?.organizationId,
    payload?.metadata?.organizationId,
    payload?.call?.metadata?.organizationId,
    payload?.call?.assistant?.metadata?.organizationId,
    payload?.assistant?.metadata?.organizationId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
}

function isMissingRelationError(error) {
  const message = error?.message || '';
  return /relation .* does not exist|Could not find the table|schema cache/i.test(message);
}

function resolveEventType(payload) {
  return payload?.type || payload?.event || payload?.message?.type || 'unknown';
}

function resolveExternalId(payload) {
  const candidates = [
    payload?.id,
    payload?.message?.id,
    payload?.call?.id,
    payload?.callId,
    payload?.vapiCallId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
}

function resolveTranscript(payload) {
  const candidates = [
    payload?.transcript,
    payload?.call?.transcript,
    payload?.call?.artifact?.transcript,
    payload?.call?.artifact?.messagesOpenAIFormatted,
    payload?.call?.analysis?.transcript,
    payload?.message?.transcript,
    payload?.messages,
    payload?.conversation,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (Array.isArray(candidate)) {
      const joined = candidate
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }

          if (entry && typeof entry === 'object') {
            return entry.text || entry.message || entry.content || '';
          }

          return '';
        })
        .filter(Boolean)
        .join('\n');

      if (joined.trim()) {
        return joined.trim();
      }
    }
  }

  return '';
}

function parseString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function getNestedValue(source, path) {
  let current = source;

  for (const segment of path) {
    const record = parseObject(current);

    if (!record || !(segment in record)) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}

function normalizePhone(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return value.trim();
}

function toIsoTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value > 1e12 ? value : value * 1000;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return toIsoTimestamp(numeric);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function resolveCallPayload(payload) {
  return parseObject(payload?.call) || parseObject(payload) || {};
}

function resolveAssistantId(payload) {
  const candidates = [
    payload?.assistantId,
    payload?.call?.assistantId,
    payload?.assistant?.id,
    payload?.call?.assistant?.id,
    payload?.assistant?.assistantId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
}

function resolveStructuredOutputs(payload) {
  const candidates = [
    payload?.structuredOutputs,
    payload?.analysis?.structuredOutputs,
    payload?.call?.analysis?.structuredOutputs,
    payload?.call?.analysis?.structuredData,
    payload?.call?.artifact?.structuredOutputs,
  ];

  for (const candidate of candidates) {
    const structured = parseObject(candidate);

    if (structured) {
      return structured;
    }
  }

  return {};
}

function resolveTranscriptEntries(payload) {
  const candidates = [
    payload?.call?.artifact?.transcript,
    payload?.call?.artifact?.messagesOpenAIFormatted,
    payload?.call?.transcript,
    payload?.transcript,
    payload?.messages,
    payload?.conversation,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const entries = candidate
        .map((entry, index) => {
          if (typeof entry === 'string' && entry.trim()) {
            return {
              id: `line-${index + 1}`,
              role: 'system',
              text: entry.trim(),
            };
          }

          const item = parseObject(entry);

          if (!item) {
            return null;
          }

          const text =
            parseString(item.text) ||
            parseString(item.message) ||
            parseString(item.content) ||
            parseString(item.transcript);

          if (!text) {
            return null;
          }

          return {
            id: parseString(item.id, `line-${index + 1}`),
            role: parseString(item.role) || parseString(item.speaker) || parseString(item.participant) || 'system',
            text,
            timestamp: toIsoTimestamp(item.timestamp || item.time || item.createdAt) || undefined,
          };
        })
        .filter(Boolean);

      if (entries.length) {
        return entries;
      }
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
          id: `line-${index + 1}`,
          role: 'system',
          text: line,
        }));
    }
  }

  return [];
}

function transcriptToText(entries) {
  return entries.map((entry) => `${entry.role}: ${entry.text}`).join('\n').trim();
}

function resolveSummary(payload) {
  const candidates = [
    payload?.summary,
    payload?.call?.summary,
    payload?.analysis?.summary,
    payload?.call?.analysis?.summary,
    payload?.call?.analysis?.structuredSummary,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || '';
}

function resolveRecordingUrl(payload) {
  const candidates = [
    payload?.recordingUrl,
    payload?.recording?.url,
    payload?.call?.recordingUrl,
    payload?.call?.artifact?.recordingUrl,
    payload?.call?.artifact?.stereoRecordingUrl,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) || null;
}

function resolveDirection(payload) {
  const rawDirection =
    parseString(payload?.direction) ||
    parseString(payload?.call?.direction) ||
    parseString(payload?.message?.direction) ||
    '';

  return rawDirection.toLowerCase().includes('out') ? 'outbound' : 'inbound';
}

function resolveStatus(payload, eventType) {
  const rawStatus =
    parseString(payload?.status) ||
    parseString(payload?.call?.status) ||
    parseString(payload?.call?.endedReason) ||
    parseString(payload?.reason) ||
    '';

  if (rawStatus) {
    return rawStatus;
  }

  if (eventType.toLowerCase().includes('end')) {
    return 'completed';
  }

  if (eventType.toLowerCase().includes('fail')) {
    return 'failed';
  }

  return eventType || 'unknown';
}

function resolveDisposition(payload) {
  const candidates = [
    payload?.disposition,
    payload?.endedReason,
    payload?.call?.disposition,
    payload?.call?.endedReason,
    payload?.reason,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) || null;
}

function resolveCostUsd(payload) {
  return (
    parseNumber(payload?.costUsd) ??
    parseNumber(payload?.cost) ??
    parseNumber(payload?.call?.costUsd) ??
    parseNumber(payload?.call?.cost) ??
    parseNumber(getNestedValue(payload, ['call', 'analysis', 'costUsd'])) ??
    null
  );
}

function resolveLatencyMs(payload) {
  return (
    parseNumber(payload?.latencyMs) ??
    parseNumber(payload?.call?.latencyMs) ??
    parseNumber(getNestedValue(payload, ['call', 'analysis', 'latencyMs'])) ??
    parseNumber(getNestedValue(payload, ['metrics', 'latencyMs'])) ??
    null
  );
}

function resolveStartedAt(payload) {
  const candidates = [
    payload?.startedAt,
    payload?.startTime,
    payload?.call?.startedAt,
    payload?.call?.startTime,
    payload?.createdAt,
    payload?.timestamp,
  ];

  for (const candidate of candidates) {
    const resolved = toIsoTimestamp(candidate);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function resolveEndedAt(payload) {
  const candidates = [
    payload?.endedAt,
    payload?.endTime,
    payload?.call?.endedAt,
    payload?.call?.endTime,
    payload?.completedAt,
    payload?.call?.completedAt,
  ];

  for (const candidate of candidates) {
    const resolved = toIsoTimestamp(candidate);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function resolveDurationSeconds(payload, startedAt, endedAt) {
  const explicitDuration =
    parseNumber(payload?.durationSeconds) ??
    parseNumber(payload?.duration) ??
    parseNumber(payload?.call?.durationSeconds) ??
    parseNumber(payload?.call?.duration);

  if (explicitDuration !== null) {
    return Math.max(0, Math.round(explicitDuration));
  }

  if (startedAt && endedAt) {
    return Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  }

  return null;
}

function deriveWinStatus(summary, disposition, structuredOutputs) {
  const explicit =
    parseString(structuredOutputs.winStatus) ||
    parseString(structuredOutputs.outcome) ||
    parseString(structuredOutputs.result);

  if (explicit) {
    return explicit.toLowerCase();
  }

  const haystack = `${summary} ${disposition || ''}`.toLowerCase();

  if (/(booked|won|qualified|converted)/.test(haystack)) {
    return 'won';
  }

  if (/(lost|no show|unqualified|do not call)/.test(haystack)) {
    return 'lost';
  }

  return null;
}

function derivePipelineStage(winStatus, structuredOutputs) {
  const explicit = parseString(structuredOutputs.pipelineStage) || parseString(structuredOutputs.stage);

  if (explicit) {
    return explicit.toLowerCase();
  }

  if (winStatus === 'won') {
    return 'won';
  }

  if (winStatus === 'lost') {
    return 'lost';
  }

  return 'new';
}

function extractEmail(transcriptText, structuredOutputs) {
  const explicit =
    parseString(structuredOutputs.email) ||
    parseString(structuredOutputs.contactEmail) ||
    parseString(structuredOutputs.customerEmail);

  if (explicit) {
    return explicit.toLowerCase();
  }

  const emailMatch = transcriptText.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return emailMatch?.[1]?.toLowerCase() || null;
}

function extractName(payload, transcriptText, structuredOutputs) {
  const candidates = [
    structuredOutputs.name,
    structuredOutputs.customerName,
    payload?.customer?.name,
    payload?.call?.customer?.name,
    payload?.call?.customerName,
  ];

  const explicit = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());

  if (explicit) {
    return explicit.trim();
  }

  const nameMatch = transcriptText.match(/(?:my name is|this is|i am)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i);
  return nameMatch?.[1] || null;
}

function extractService(payload, structuredOutputs) {
  const candidates = [
    structuredOutputs.service,
    structuredOutputs.intent,
    payload?.service,
    payload?.intent,
    payload?.call?.intent,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) || 'New inquiry';
}

function resolveCustomerPhone(payload, direction) {
  const candidates =
    direction === 'outbound'
      ? [
          payload?.customer?.number,
          payload?.customer?.phoneNumber,
          payload?.call?.customer?.number,
          payload?.to,
          payload?.toNumber,
          payload?.call?.to,
          payload?.call?.toNumber,
        ]
      : [
          payload?.customer?.number,
          payload?.customer?.phoneNumber,
          payload?.call?.customer?.number,
          payload?.from,
          payload?.fromNumber,
          payload?.call?.from,
          payload?.call?.fromNumber,
        ];

  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function safeUpsertTable(table, payload, options) {
  const client = ensureSupabase();
  const result = await client.from(table).upsert(payload, options).select('id').maybeSingle();

  if (result.error && !isMissingRelationError(result.error)) {
    throw new Error(result.error.message);
  }

  return result.data || null;
}

async function resolveAssistantContext(client, payload) {
  const assistantId = resolveAssistantId(payload);
  const organizationId = resolveOrganizationId(payload);

  if (!assistantId) {
    return {
      organizationId,
      agentId: null,
      assistantId: null,
      icpPackId: null,
      assistantMetadata: {},
    };
  }

  const [agentResult, inventoryResult] = await Promise.all([
    client
      .from('agents')
      .select('id, organization_id, config')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle(),
    client
      .from('assistant_inventory')
      .select('organization_id, local_agent_id, icp_pack_id, metadata')
      .eq('remote_assistant_id', assistantId)
      .is('archived_at', null)
      .maybeSingle(),
  ]);

  const agentConfig = parseObject(agentResult.data?.config);
  const inventoryMetadata = parseObject(inventoryResult.data?.metadata) || {};

  return {
    organizationId: agentResult.data?.organization_id || inventoryResult.data?.organization_id || organizationId,
    agentId: agentResult.data?.id || inventoryResult.data?.local_agent_id || null,
    assistantId,
    icpPackId:
      inventoryResult.data?.icp_pack_id ||
      parseString(agentConfig?.icpPackId) ||
      parseString(inventoryMetadata.icpPackId) ||
      null,
    assistantMetadata: inventoryMetadata,
  };
}

async function ensureContactRecord(client, normalized) {
  const { organizationId, phone, email, name, service, summary, callId, startedAt, winStatus, icpPackId } = normalized;

  if (!organizationId || (!phone && !email && !name)) {
    return null;
  }

  let existingContact = null;

  if (phone) {
    const contactResult = await client
      .from('contacts')
      .select('id, metadata')
      .eq('organization_id', organizationId)
      .eq('phone_e164', phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contactResult.error && !isMissingRelationError(contactResult.error)) {
      throw new Error(contactResult.error.message);
    }

    existingContact = contactResult.data || null;
  }

  const metadata = {
    ...(parseObject(existingContact?.metadata) || {}),
    email: email || parseString(existingContact?.metadata?.email) || null,
    service,
    intent: service,
    icpPackId: icpPackId || null,
    lastSummary: summary,
    recoveryStatus: 'structured',
  };

  const payload = {
    organization_id: organizationId,
    full_name: name || null,
    phone_e164: phone,
    source: 'voice assistant',
    metadata,
    pipeline_stage: derivePipelineStage(winStatus, {}),
    last_call_id: callId || null,
    last_call_at: startedAt || null,
    win_status: winStatus || null,
    notes: summary || null,
    export_metadata: {
      source: 'worker-webhook',
      lastPreparedAt: new Date().toISOString(),
    },
  };

  if (existingContact?.id) {
    const update = await client.from('contacts').update(payload).eq('id', existingContact.id).select('id').maybeSingle();

    if (update.error && !isMissingRelationError(update.error)) {
      throw new Error(update.error.message);
    }

    return update.data?.id || existingContact.id;
  }

  const insert = await client.from('contacts').insert(payload).select('id').maybeSingle();

  if (insert.error && !isMissingRelationError(insert.error)) {
    throw new Error(insert.error.message);
  }

  return insert.data?.id || null;
}

async function ensureLeadCaptureAttempt(client, normalized, contactId) {
  if (!normalized.callId) {
    return;
  }

  const existing = await client
    .from('lead_capture_attempts')
    .select('id')
    .eq('call_id', normalized.callId)
    .eq('source', 'structured')
    .limit(1)
    .maybeSingle();

  if (existing.error && !isMissingRelationError(existing.error)) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    return;
  }

  const missingFields = [];

  if (!normalized.name) {
    missingFields.push('Name');
  }

  if (!normalized.phone) {
    missingFields.push('Phone');
  }

  if (!normalized.email) {
    missingFields.push('Email');
  }

  await safeInsertTable('lead_capture_attempts', {
    organization_id: normalized.organizationId || null,
    call_id: normalized.callId,
    lead_id: contactId || null,
    icp_pack_id: normalized.icpPackId || null,
    source: 'structured',
    status: missingFields.length ? 'partial' : 'captured',
    confidence: missingFields.length ? 0.72 : 0.91,
    missing_fields: missingFields,
  });
}

async function ensureCallQaGrade(client, normalized, transcriptEntries) {
  if (!normalized.callId) {
    return;
  }

  const existing = await client
    .from('call_qa_grades')
    .select('id')
    .eq('call_id', normalized.callId)
    .limit(1)
    .maybeSingle();

  if (existing.error && !isMissingRelationError(existing.error)) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    return;
  }

  const score =
    55 +
    Math.min(20, transcriptEntries.length * 4) +
    (normalized.summary ? 10 : 0) +
    (normalized.winStatus === 'won' ? 10 : 0);
  const overallScore = Math.min(98, score);
  const scoreLabel =
    overallScore >= 85 ? 'excellent' : overallScore >= 70 ? 'strong' : overallScore >= 55 ? 'watch' : 'weak';

  await safeInsertTable('call_qa_grades', {
    call_id: normalized.callId,
    icp_pack_id: normalized.icpPackId || null,
    overall_score: overallScore,
    score_label: scoreLabel,
    rubric_scores: [
      { label: 'Transcript coverage', score: Math.min(5, transcriptEntries.length) },
      { label: 'Outcome clarity', score: normalized.summary ? 4 : 2 },
      { label: 'Lead capture', score: normalized.email || normalized.phone ? 4 : 2 },
    ],
    notes: [
      normalized.summary
        ? 'Worker generated QA stub from normalized webhook artifacts.'
        : 'Call QA stub created without a detailed summary; review recommended.',
    ],
  });
}

async function normalizeWebhookEvent(payload, eventIngestId) {
  const client = ensureSupabase();
  const eventType = resolveEventType(payload);
  const transcriptEntries = resolveTranscriptEntries(payload);
  const transcriptText = transcriptToText(transcriptEntries) || resolveTranscript(payload);
  const summary = resolveSummary(payload) || transcriptText.split('\n').slice(0, 4).join(' ').slice(0, 320);
  const assistantContext = await resolveAssistantContext(client, payload);
  const structuredOutputs = resolveStructuredOutputs(payload);
  const direction = resolveDirection(payload);
  const startedAt = resolveStartedAt(payload) || new Date().toISOString();
  const endedAt = resolveEndedAt(payload);
  const durationSeconds = resolveDurationSeconds(payload, startedAt, endedAt);
  const phone = resolveCustomerPhone(payload, direction);
  const email = extractEmail(transcriptText, structuredOutputs);
  const name = extractName(payload, transcriptText, structuredOutputs);
  const service = extractService(payload, structuredOutputs);
  const disposition = resolveDisposition(payload);
  const winStatus = deriveWinStatus(summary, disposition, structuredOutputs);
  const status = resolveStatus(payload, eventType);
  const callPayload = resolveCallPayload(payload);
  const normalized = {
    organizationId: assistantContext.organizationId,
    agentId: assistantContext.agentId,
    assistantId: assistantContext.assistantId,
    icpPackId: assistantContext.icpPackId || parseString(structuredOutputs.icpPackId) || null,
    callId: null,
    transcriptText,
    summary,
    name,
    email,
    phone,
    service,
    startedAt,
    endedAt,
    winStatus,
  };

  if (!normalized.organizationId) {
    return normalized;
  }

  const assistantMetadata = parseObject(callPayload.assistant?.metadata) || parseObject(payload?.assistant?.metadata) || {};
  const fromNumber = direction === 'outbound' ? normalizePhone(callPayload.fromNumber || callPayload.from || payload?.fromNumber || payload?.from) : phone;
  const toNumber = direction === 'outbound' ? phone : normalizePhone(callPayload.toNumber || callPayload.to || payload?.toNumber || payload?.to);
  const metadata = {
    ...(parseObject(callPayload.metadata) || {}),
    assistantName: parseString(callPayload.assistant?.name) || parseString(payload?.assistant?.name) || null,
    modelName:
      parseString(getNestedValue(callPayload, ['assistant', 'model', 'model'])) ||
      parseString(getNestedValue(payload, ['assistant', 'model', 'model'])) ||
      null,
    eventType,
    structuredOutputs,
    assistantMetadata,
    normalizedAt: new Date().toISOString(),
  };
  const callRecord = {
    organization_id: normalized.organizationId,
    agent_id: normalized.agentId || null,
    vapi_assistant_id: normalized.assistantId || null,
    vapi_call_id: resolveExternalId(payload),
    direction,
    call_status: status,
    from_number: fromNumber,
    to_number: toNumber,
    duration_seconds: durationSeconds,
    summary: summary || null,
    metadata,
    started_at: startedAt,
    ended_at: endedAt,
    recording_url: resolveRecordingUrl(payload),
    transcript_json: transcriptEntries,
    cost_usd: resolveCostUsd(payload),
    latency_ms: resolveLatencyMs(payload),
    disposition,
    win_status: winStatus,
    raw_event_id: eventIngestId,
  };
  let callRow = null;

  if (callRecord.vapi_call_id) {
    callRow = await safeUpsertTable('calls', callRecord, {
      onConflict: 'vapi_call_id',
      ignoreDuplicates: false,
    });
  } else {
    const insert = await client.from('calls').insert(callRecord).select('id').maybeSingle();

    if (insert.error && !isMissingRelationError(insert.error)) {
      throw new Error(insert.error.message);
    }

    callRow = insert.data || null;
  }

  normalized.callId = callRow?.id || null;

  const contactId = await ensureContactRecord(client, normalized);
  await ensureLeadCaptureAttempt(client, normalized, contactId);
  await ensureCallQaGrade(client, normalized, transcriptEntries);

  const update = await client
    .from('worker_event_ingests')
    .update({
      organization_id: normalized.organizationId,
      payload: {
        ...payload,
        normalized: {
          organizationId: normalized.organizationId,
          agentId: normalized.agentId,
          callId: normalized.callId,
          contactId,
          winStatus: normalized.winStatus,
          summary,
          transcriptLength: transcriptEntries.length,
        },
      },
    })
    .eq('id', eventIngestId);

  if (update.error && !isMissingRelationError(update.error)) {
    throw new Error(update.error.message);
  }

  return {
    ...normalized,
    contactId,
  };
}

function buildFallbackLeadRecovery(job) {
  const transcript = typeof job.payload?.transcript === 'string' ? job.payload.transcript : '';
  const summary = typeof job.payload?.summary === 'string' ? job.payload.summary : '';
  const phoneMatch = transcript.match(/(?:phone|number|callback)[^+\d]*(\+?[\d\-\(\)\s]{7,})/i);
  const emailMatch = transcript.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const nameMatch = transcript.match(/(?:my name is|this is|i am)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i);
  const confidence = phoneMatch || emailMatch ? 0.72 : 0.56;

  return {
    provider: 'fallback',
    status: confidence >= 0.65 ? 'partial' : 'needs-review',
    confidence,
    missing_fields: emailMatch ? [] : ['Email'],
    extracted_lead: {
      name: nameMatch?.[1] || 'Unknown caller',
      phone: phoneMatch?.[1] || null,
      email: emailMatch?.[1] || null,
      summary: summary || transcript.slice(0, 220),
    },
    notes: [
      'Worker fallback recovery created from transcript heuristics.',
    ],
  };
}

async function safeInsertTable(table, payload) {
  const client = ensureSupabase();
  const result = await client.from(table).insert(payload);

  if (result.error && !isMissingRelationError(result.error)) {
    throw new Error(result.error.message);
  }
}

async function vapiFetch(path, init = {}, idempotencyKey, apiKey = vapiApiKey) {
  if (!apiKey) {
    ensureVapi();
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  const response = await fetch(`${vapiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Vapi API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function claimWorkerJobs(queueName) {
  const client = ensureSupabase();
  const result = await client.rpc('claim_worker_jobs_v2', {
    batch_size: batchSize,
    target_queue: queueName,
    worker_name: workerId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data || [];
}

async function markJobCompleted(jobId) {
  const client = ensureSupabase();
  const result = await client
    .from('worker_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', jobId);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function markJobFailed(job, error) {
  const client = ensureSupabase();
  const attempts = Number(job.attempts || 1);
  const maxAttempts = Number(job.max_attempts || 8);
  const retryDelaySeconds = Math.min(300, Math.max(20, attempts * 30));
  const nextStatus = attempts >= maxAttempts ? 'failed' : 'queued';

  const result = await client
    .from('worker_jobs')
    .update({
      status: nextStatus,
      available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: error instanceof Error ? error.message : String(error),
      completed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
    })
    .eq('id', job.id);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

function getVoiceDefaults() {
  return {
    modelProvider: process.env.VAPI_DEFAULT_MODEL_PROVIDER || 'openai',
    modelName: process.env.VAPI_DEFAULT_MODEL_NAME || 'gpt-realtime-2025-08-28',
    voiceProvider: process.env.VAPI_DEFAULT_VOICE_PROVIDER || 'openai',
    voiceId: process.env.VAPI_DEFAULT_VOICE_ID || 'marin',
    fallbackVoiceProvider: process.env.VAPI_FALLBACK_VOICE_PROVIDER || 'openai',
    fallbackVoiceId: process.env.VAPI_FALLBACK_VOICE_ID || 'cedar',
  };
}

async function processCampaignLaunchJob(job) {
  const client = ensureSupabase();
  const payload = job.payload || {};
  const campaignRecordId = payload.campaignRecordId;
  const sourceAgentId = payload.sourceAgentId;
  const campaignName = payload.campaignName;
  const script = payload.script;
  const resolvedVapiApiKey = typeof payload.vapiApiKey === 'string' && payload.vapiApiKey ? payload.vapiApiKey : vapiApiKey;

  if (typeof campaignRecordId !== 'string' || typeof sourceAgentId !== 'string' || typeof campaignName !== 'string' || typeof script !== 'string') {
    throw new Error('Campaign launch job payload is missing the required fields.');
  }

  const [campaignResult, recipientsResult, agentResult] = await Promise.all([
    client.from('campaigns').select('id, status, target_filter, schedule').eq('id', campaignRecordId).maybeSingle(),
    client
      .from('campaign_recipients')
      .select('id, contact_name, phone_number, row_number, status')
      .eq('campaign_id', campaignRecordId)
      .order('row_number', { ascending: true }),
    client.from('agents').select('id, name, vapi_assistant_id, config').eq('id', sourceAgentId).maybeSingle(),
  ]);

  if (campaignResult.error || !campaignResult.data) {
    throw new Error(campaignResult.error?.message || 'Campaign record could not be loaded.');
  }

  if (campaignResult.data.status === 'active') {
    return;
  }

  if (recipientsResult.error) {
    throw new Error(recipientsResult.error.message);
  }

  if (agentResult.error || !agentResult.data) {
    throw new Error(agentResult.error?.message || 'Source campaign assistant could not be loaded.');
  }

  const recipients = (recipientsResult.data || []).filter((recipient) => recipient.phone_number);

  if (!recipients.length) {
    throw new Error('Campaign has no valid recipients to dispatch.');
  }

  const defaults = getVoiceDefaults();
  const sourceVoice = String(agentResult.data.config?.voiceId || defaults.voiceId);
  const resolvedPhoneNumberId =
    (typeof payload.phoneNumberId === 'string' && payload.phoneNumberId) ||
    process.env.VAPI_OUTBOUND_PHONE_NUMBER_ID ||
    '';

  if (!resolvedPhoneNumberId) {
    throw new Error('No outbound phone number is configured for the worker.');
  }

  const assistant = await vapiFetch(
    '/assistant',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `${campaignName} Campaign Agent`,
        firstMessage: script,
        model: {
          provider: defaults.modelProvider,
          model: defaults.modelName,
          messages: [
            {
              role: 'system',
              content: [
                'You are a dedicated campaign broadcast agent.',
                'Introduce the business immediately, explain the reason for the outreach, and respect opt-out signals.',
                `Campaign script: ${script}`,
                `Source organization agent: ${agentResult.data.name}`,
                agentResult.data.vapi_assistant_id ? `Source Vapi assistant: ${agentResult.data.vapi_assistant_id}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
        voice: {
          provider: defaults.voiceProvider,
          voiceId: typeof payload.voiceLabel === 'string' && payload.voiceLabel ? payload.voiceLabel : sourceVoice,
          fallbackPlan: {
            voices: [
              {
                provider: defaults.fallbackVoiceProvider,
                voiceId: defaults.fallbackVoiceId,
              },
            ],
          },
        },
      }),
    },
    `campaign-assistant-${campaignRecordId}`,
    resolvedVapiApiKey,
  );

  const campaign = await vapiFetch(
    '/campaign',
    {
      method: 'POST',
      body: JSON.stringify({
        name: campaignName,
        assistantId: assistant.id,
        phoneNumberId: resolvedPhoneNumberId,
        customers: recipients.map((recipient) => ({
          number: recipient.phone_number,
          name: recipient.contact_name || undefined,
        })),
      }),
    },
    `campaign-${campaignRecordId}`,
    resolvedVapiApiKey,
  );

  const nextTargetFilter = {
    ...(campaignResult.data.target_filter || {}),
    acceptedRecipients: recipients.length,
    vapiCampaignId: campaign.id,
  };
  const nextSchedule = {
    ...(campaignResult.data.schedule || {}),
    generatedAssistantId: assistant.id,
    phoneNumberId: resolvedPhoneNumberId,
    launchedAt: new Date().toISOString(),
    dispatchedBy: workerId,
  };

  const [campaignUpdate, recipientUpdate] = await Promise.all([
    client
      .from('campaigns')
      .update({
        status: 'active',
        target_filter: nextTargetFilter,
        schedule: nextSchedule,
      })
      .eq('id', campaignRecordId),
    client
      .from('campaign_recipients')
      .update({
        status: 'submitted',
      })
      .eq('campaign_id', campaignRecordId),
  ]);

  if (campaignUpdate.error) {
    throw new Error(campaignUpdate.error.message);
  }

  if (recipientUpdate.error) {
    throw new Error(recipientUpdate.error.message);
  }
}

async function processLeadRecoveryJob(job) {
  const client = ensureSupabase();
  const payload = job.payload || {};
  const recovery = buildFallbackLeadRecovery(job);

  await safeInsertTable('lead_recovery_runs', {
    organization_id: payload.organizationId || null,
    call_id: payload.callId || null,
    icp_pack_id: payload.icpPackId || null,
    provider: recovery.provider,
    status: recovery.status,
    confidence: recovery.confidence,
    missing_fields: recovery.missing_fields,
    extracted_lead: recovery.extracted_lead,
    notes: recovery.notes,
  });

  await safeInsertTable('lead_capture_attempts', {
    organization_id: payload.organizationId || null,
    call_id: payload.callId || null,
    icp_pack_id: payload.icpPackId || null,
    source: 'transcript-recovery',
    status: recovery.status === 'needs-review' ? 'partial' : 'captured',
    confidence: recovery.confidence,
    missing_fields: recovery.missing_fields,
  });

  if (payload.eventIngestId) {
    const update = await client
      .from('worker_event_ingests')
      .update({
        payload: {
          ...(payload.rawPayload || {}),
          leadRecovery: {
            status: recovery.status,
            confidence: recovery.confidence,
          },
        },
      })
      .eq('id', payload.eventIngestId);

    if (update.error && !isMissingRelationError(update.error)) {
      throw new Error(update.error.message);
    }
  }
}

async function drainQueue(queueName = 'campaign-dispatch') {
  if (queueState.isDraining || !supabase) {
    return { accepted: false, reason: queueState.isDraining ? 'already-draining' : 'supabase-missing' };
  }

  queueState.isDraining = true;
  queueState.lastLoopAt = new Date().toISOString();

  try {
    const jobs = await claimWorkerJobs(queueName);

    await Promise.all(
      jobs.map(async (job) => {
        try {
          if (job.job_type === 'campaign.launch') {
            await processCampaignLaunchJob(job);
            queueState.processedCampaigns += 1;
          } else if (job.job_type === 'lead.recover') {
            await processLeadRecoveryJob(job);
            queueState.processedLeadJobs += 1;
          }

          await markJobCompleted(job.id);
        } catch (error) {
          queueState.failedCampaigns += 1;
          queueState.lastError = error instanceof Error ? error.message : String(error);

          if (job.job_type === 'campaign.launch') {
            const campaignRecordId = job.payload?.campaignRecordId;

            if (typeof campaignRecordId === 'string') {
              await supabase
                .from('campaigns')
                .update({
                  status: 'failed',
                })
                .eq('id', campaignRecordId);
            }
          }

          await markJobFailed(job, error);
        }
      }),
    );

    return { accepted: true, claimed: jobs.length };
  } finally {
    queueState.isDraining = false;
  }
}

function scheduleQueueDrain() {
  if (!supabase) {
    return;
  }

  setInterval(() => {
    void Promise.all([drainQueue('campaign-dispatch'), drainQueue('lead-ops')]).catch((error) => {
      queueState.lastError = error instanceof Error ? error.message : String(error);
    });
  }, pollIntervalMs);

  void Promise.all([drainQueue('campaign-dispatch'), drainQueue('lead-ops')]).catch((error) => {
    queueState.lastError = error instanceof Error ? error.message : String(error);
  });
}

scheduleQueueDrain();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json(response, 200, {
      ok: true,
      service: 'vapi-voice-ops-worker',
      workerId,
      supabaseReady: hasSupabase,
      vapiReady: hasVapi,
      batchSize,
      pollIntervalMs,
      queueState,
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'POST' && url.pathname === '/jobs/blast-dispatch') {
    if (!isAuthorizedRequest(request)) {
      return json(response, 401, { error: 'unauthorized' });
    }

    try {
      const result = await drainQueue('campaign-dispatch');
      return json(response, 202, result);
    } catch (error) {
      return json(response, 500, {
        error: error instanceof Error ? error.message : 'Unable to drain the campaign queue.',
      });
    }
  }

  if (request.method === 'POST' && url.pathname === '/webhooks/vapi/call-events') {
    if (!isWebhookAuthorized(request)) {
      return json(response, 401, { error: 'unauthorized' });
    }

    try {
      const client = ensureSupabase();
      const payload = await readJsonBody(request);
      const externalId = resolveExternalId(payload);
      const ingestPayload = {
        organization_id: resolveOrganizationId(payload),
        provider: 'vapi',
        event_type: resolveEventType(payload),
        external_id: externalId,
        payload,
      };
      const insert = externalId
        ? await client
            .from('worker_event_ingests')
            .upsert(ingestPayload, {
              onConflict: 'provider,external_id',
              ignoreDuplicates: false,
            })
            .select('id')
            .maybeSingle()
        : await client
            .from('worker_event_ingests')
            .insert(ingestPayload)
            .select('id')
            .maybeSingle();

      if (insert.error) {
        throw new Error(insert.error.message);
      }

      const eventIngestId = insert.data?.id || randomUUID();

      queueState.receivedWebhooks += 1;
      const normalized = await normalizeWebhookEvent(payload, eventIngestId);

      const transcript = normalized.transcriptText || resolveTranscript(payload);

      if (transcript) {
        const jobInsert = await client.from('worker_jobs').upsert(
          {
            queue_name: 'lead-ops',
            job_type: 'lead.recover',
            organization_id: normalized.organizationId || resolveOrganizationId(payload),
            payload: {
              organizationId: normalized.organizationId || resolveOrganizationId(payload),
              callId: normalized.callId,
              transcript,
              summary: normalized.summary || payload?.summary || payload?.call?.summary || '',
              icpPackId: normalized.icpPackId || payload?.metadata?.icpPackId || payload?.call?.assistant?.metadata?.icpPackId || null,
              eventIngestId,
              rawPayload: payload,
            },
            idempotency_key: `lead-recover-${normalized.callId || externalId || eventIngestId}`,
          },
          { onConflict: 'idempotency_key', ignoreDuplicates: false },
        );

        if (jobInsert.error && !isMissingRelationError(jobInsert.error)) {
          throw new Error(jobInsert.error.message);
        }
      }

      return json(response, 202, {
        accepted: true,
        eventType: resolveEventType(payload),
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      return json(response, 500, {
        error: error instanceof Error ? error.message : 'Unable to persist the webhook event.',
      });
    }
  }

  return json(response, 404, {
    error: 'not_found',
  });
});

server.listen(port, () => {
  console.log(`vapi-voice-ops-worker listening on port ${port}`);
});
