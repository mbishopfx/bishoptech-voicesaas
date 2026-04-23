import { randomUUID } from 'node:crypto';

import { buildAssistantConfigSnapshot, getSystemMessage, normalizeAssistantConfig } from '@/lib/assistant-config';
import { formatDateTime, formatDuration, formatPhoneNumber, formatRelativeTime } from '@/lib/format';
import { getDefaultOrganizationId } from '@/lib/auth';
import { icpTemplatePacks } from '@/lib/icp-packs';
import { safeInsert, safeUpsert } from '@/lib/ops-storage';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { DashboardAgent, DemoBlueprintSummary, KnowledgeAsset, LeadRecord, RecentCall, ViewerContext } from '@/lib/types';
import type {
  AssistantInventoryItem,
  AssistantStats,
  ICPTemplatePack,
  SupportTicket,
} from '@/lib/voiceops-contracts';
import {
  createAssistant,
  getAssistant,
  listAssistants,
  listCalls,
  listPhoneNumbers,
  runAnalyticsQueries,
  type VapiAssistantPayload,
  type VapiAssistantRecord,
  type VapiCallRecord,
  type VapiPhoneNumberRecord,
} from '@/lib/vapi';
import { resolveVapiCredentialsForOrganization } from '@/lib/vapi-credentials';

type OrganizationRow = {
  id: string;
  name: string;
  slug?: string;
  timezone?: string;
  plan_name?: string | null;
  is_active?: boolean;
};

type AgentRow = {
  id: string;
  organization_id: string;
  name: string;
  agent_type: string;
  vapi_assistant_id: string | null;
  config: Record<string, unknown> | null;
  vapi_sync_status?: string | null;
  vapi_last_error?: string | null;
  vapi_last_synced_at?: string | null;
  vapi_last_published_at?: string | null;
  updated_at?: string;
};

type CallRow = {
  id: string;
  organization_id: string;
  agent_id?: string | null;
  vapi_assistant_id?: string | null;
  vapi_call_id?: string | null;
  direction: 'inbound' | 'outbound';
  call_status: string;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  recording_url?: string | null;
  transcript_json?: unknown;
  cost_usd?: number | null;
  latency_ms?: number | null;
  disposition?: string | null;
  win_status?: string | null;
};

type ContactRow = {
  id: string;
  organization_id: string;
  full_name: string | null;
  phone_e164: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
  pipeline_stage?: string | null;
  last_call_at?: string | null;
  win_status?: string | null;
  notes?: string | null;
};

type TicketRow = {
  id: string;
  organization_id: string;
  agent_id?: string | null;
  contact_id?: string | null;
  ticket_type: SupportTicket['ticketType'];
  status: SupportTicket['status'];
  priority: SupportTicket['priority'];
  subject: string;
  description: string;
  preferred_meeting_at?: string | null;
  created_at: string;
  updated_at: string;
  requested_by?: string | null;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_user_id?: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

type RevisionRow = {
  id: string;
  action: string;
  version: number;
  created_at: string;
  note: string | null;
};

type InventoryRow = {
  id: string;
  organization_id?: string | null;
  local_agent_id?: string | null;
  remote_assistant_id: string;
  name: string;
  provider: string;
  account_mode: 'managed' | 'byo';
  sync_status: 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';
  managed_by?: string | null;
  icp_pack_id?: string | null;
  remote_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  last_seen_at?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
};

type TemplatePackRow = {
  id: string;
  slug: string;
  label: string;
  vertical: string;
  summary: string;
  configuration: Record<string, unknown> | null;
};

type PhoneNumberRow = {
  phone_e164?: string | null;
  friendly_name?: string | null;
};

type DemoBlueprintRow = {
  id: string;
  organization_id: string;
  title: string;
  website_url?: string | null;
  created_at: string;
  status?: string | null;
  knowledge_pack_slug?: string | null;
  query_tool_id?: string | null;
  vapi_assistant_id?: string | null;
  kb_sync_status?: string | null;
  last_test_call_id?: string | null;
  last_test_call_at?: string | null;
  embed_snippet?: string | null;
};

type DemoBlueprintAssetRow = {
  id: string;
  demo_blueprint_id: string;
  asset_type: string;
  source_label: string;
  source_url?: string | null;
  file_name?: string | null;
  file_ext?: string | null;
  mime_type?: string | null;
  storage_path?: string | null;
  byte_size?: number | null;
  vapi_file_id?: string | null;
  sync_status?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type SyncSummary = {
  runId?: string;
  mode: 'portfolio' | 'workspace';
  assistantsSeen: number;
  assistantsChanged: number;
  assistantsAttached: number;
  phonesSeen: number;
  callsSeen: number;
  inventory: AssistantInventoryItem[];
};

function parseString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeKnowledgeAssetRow(row: DemoBlueprintAssetRow): KnowledgeAsset {
  return {
    id: row.id,
    demoBlueprintId: row.demo_blueprint_id,
    assetType: row.asset_type as KnowledgeAsset['assetType'],
    sourceLabel: row.source_label,
    sourceUrl: row.source_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileExt: row.file_ext ?? undefined,
    mimeType: row.mime_type ?? undefined,
    storagePath: row.storage_path ?? undefined,
    byteSize: row.byte_size ?? undefined,
    vapiFileId: row.vapi_file_id ?? undefined,
    syncStatus: (row.sync_status as KnowledgeAsset['syncStatus']) ?? 'pending',
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

function getNestedValue(source: Record<string, unknown> | null | undefined, path: string[]) {
  let current: unknown = source;

  for (const segment of path) {
    const record = parseObject(current);

    if (!record || !(segment in record)) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}

function toIsoDate(value?: string | null) {
  return value ? new Date(value).toISOString() : undefined;
}

function normalizeRemoteMetadata(record: VapiAssistantRecord) {
  return parseObject(record.metadata) ?? {};
}

function normalizePhoneList(rawValue: unknown) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.map((value) => parseString(value)).filter(Boolean);
}

function parseDurationLabel(value?: string) {
  if (!value) {
    return 0;
  }

  const [minutesText, secondsText] = value.split(':');
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

function guessAgentRole(record: VapiAssistantRecord) {
  const metadata = normalizeRemoteMetadata(record);
  const explicitRole = parseString(metadata.role) || parseString(metadata.agentType) || parseString(metadata.assistantRole);

  if (explicitRole === 'campaign') {
    return 'campaign';
  }

  if (explicitRole === 'outbound') {
    return 'outbound';
  }

  if (explicitRole === 'specialist') {
    return 'specialist';
  }

  const name = record.name.toLowerCase();

  if (name.includes('campaign')) {
    return 'campaign';
  }

  if (name.includes('outbound')) {
    return 'outbound';
  }

  if (name.includes('specialist')) {
    return 'specialist';
  }

  return 'inbound';
}

function buildAssistantPurpose(role: DashboardAgent['role']) {
  if (role === 'outbound') {
    return 'Outbound follow-ups, reminders, and campaign callbacks.';
  }

  if (role === 'campaign') {
    return 'Dedicated assistant for list sends, promotions, and blast workflows.';
  }

  if (role === 'specialist') {
    return 'Specialist handoff assistant for deeper qualification or routing.';
  }

  return 'Inbound voice operations for lead capture, booking, and FAQ handling.';
}

function buildPersistedAssistantConfig(
  payload: VapiAssistantPayload,
  options: {
    accountMode: 'managed' | 'byo';
    syncStatus?: 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';
    livePayload?: VapiAssistantPayload;
    lastSyncedAt?: string;
    lastPublishedAt?: string;
    purpose?: string;
    icpPackId?: string;
  },
) {
  const snapshot = buildAssistantConfigSnapshot(payload, {
    accountMode: options.accountMode,
    syncStatus: options.syncStatus ?? 'synced',
    livePayload: options.livePayload ?? payload,
    lastSyncedAt: options.lastSyncedAt ?? new Date().toISOString(),
    lastPublishedAt: options.lastPublishedAt ?? new Date().toISOString(),
  });

  return {
    purpose: options.purpose,
    icpPackId: options.icpPackId ?? null,
    voiceLabel: payload.voice.voiceId,
    modelName: payload.model.model,
    modelProvider: payload.model.provider,
    systemPrompt: getSystemMessage(payload),
    firstMessage: payload.firstMessage ?? '',
    accountMode: snapshot.accountMode,
    syncStatus: snapshot.syncStatus,
    lastError: snapshot.lastError ?? null,
    lastPublishedAt: snapshot.lastPublishedAt ?? null,
    lastSyncedAt: snapshot.lastSyncedAt ?? null,
    vapiPayload: snapshot.draftPayload,
    vapiDraftPayload: snapshot.draftPayload,
    vapiLivePayload: snapshot.livePayload,
  };
}

function buildTranscriptFromRow(row: CallRow): RecentCall['transcript'] {
  const transcriptJson = Array.isArray(row.transcript_json) ? row.transcript_json : [];

  if (transcriptJson.length) {
    return transcriptJson
      .map((entry, index) => {
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

        const rawRole =
          parseString(item.role) ||
          parseString(item.speaker) ||
          parseString(item.participant);

        const speaker: RecentCall['transcript'][number]['speaker'] =
          rawRole === 'assistant' || rawRole === 'bot'
            ? 'assistant'
            : rawRole === 'user' || rawRole === 'caller' || rawRole === 'customer'
              ? 'caller'
              : 'system';

        return {
          id: parseString(item.id, `${speaker}-${index + 1}`),
          speaker,
          label: speaker === 'assistant' ? 'Assistant' : speaker === 'caller' ? 'Caller' : 'System',
          text,
          timestamp: parseString(item.timestamp) || parseString(item.time) || undefined,
        };
      })
      .filter(Boolean) as RecentCall['transcript'];
  }

  const metadata = row.metadata ?? {};
  const legacyTranscript = getNestedValue(metadata, ['vapi', 'transcript']);

  if (Array.isArray(legacyTranscript)) {
    return legacyTranscript
      .map((entry, index) => {
        const item = parseObject(entry);
        const text = parseString(item?.text) || parseString(item?.content);
        if (!text) {
          return null;
        }

        return {
          id: `${index + 1}`,
          speaker: parseString(item?.role) === 'assistant' ? 'assistant' : 'caller',
          label: parseString(item?.role) === 'assistant' ? 'Assistant' : 'Caller',
          text,
          timestamp: parseString(item?.timestamp) || undefined,
        };
      })
      .filter(Boolean) as RecentCall['transcript'];
  }

  if (row.summary) {
    return [
      {
        id: 'summary',
        speaker: 'system',
        label: 'Summary',
        text: row.summary,
      },
    ];
  }

  return [];
}

function buildRecentCall(row: CallRow, organizationName: string): RecentCall {
  const metadata = row.metadata ?? {};
  const transcript = buildTranscriptFromRow(row);
  const recordingUrl = (row.recording_url ?? parseString(metadata.recordingUrl)) || undefined;
  const assistantName =
    parseString(metadata.assistantName) ||
    parseString(getNestedValue(metadata, ['assistant', 'name'])) ||
    undefined;
  const modelName =
    parseString(metadata.modelName) ||
    parseString(getNestedValue(metadata, ['model', 'name'])) ||
    undefined;
  const logItems = [
    { label: 'Status', value: row.call_status.replace(/_/g, ' ') },
    { label: 'Started', value: formatDateTime(row.started_at ?? row.created_at) },
    { label: 'From', value: formatPhoneNumber(row.from_number) },
    { label: 'To', value: formatPhoneNumber(row.to_number) },
    { label: 'Assistant', value: assistantName ?? parseString(row.vapi_assistant_id, 'Not linked') },
    { label: 'Model', value: modelName ?? 'Not logged' },
    { label: 'Latency', value: row.latency_ms ? `${row.latency_ms} ms` : 'N/A' },
    { label: 'Cost', value: typeof row.cost_usd === 'number' ? `$${row.cost_usd.toFixed(4)}` : 'N/A' },
  ];
  const exportText = [
    `${organizationName} call review`,
    `Outcome: ${row.call_status}`,
    `Duration: ${formatDuration(row.duration_seconds)}`,
    '',
    row.summary ?? 'No summary available.',
    '',
    transcript.map((entry) => `${entry.label}: ${entry.text}`).join('\n'),
  ].join('\n');

  return {
    id: row.id,
    organizationId: row.organization_id,
    agentId: row.agent_id ?? undefined,
    vapiAssistantId: row.vapi_assistant_id ?? undefined,
    vapiCallId: row.vapi_call_id ?? undefined,
    caller: formatPhoneNumber(row.from_number ?? row.to_number),
    organizationName,
    summary: row.summary ?? 'Call captured. Summary still pending.',
    duration: formatDuration(row.duration_seconds),
    outcome: row.call_status.replace(/_/g, ' '),
    direction: row.direction,
    recordingUrl,
    recordingLabel: recordingUrl ? 'Open recording' : undefined,
    createdAt: formatRelativeTime(row.created_at),
    fromNumber: formatPhoneNumber(row.from_number),
    toNumber: formatPhoneNumber(row.to_number),
    startedAt: formatDateTime(row.started_at ?? row.created_at),
    endedAt: row.ended_at ? formatDateTime(row.ended_at) : undefined,
    assistantName,
    modelName,
    latencyLabel: row.latency_ms ? `${row.latency_ms} ms` : undefined,
    costLabel: typeof row.cost_usd === 'number' ? `$${row.cost_usd.toFixed(4)}` : undefined,
    costUsd: row.cost_usd ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    disposition: row.disposition ?? undefined,
    winStatus: row.win_status ?? undefined,
    transcript,
    logItems,
    tags: normalizePhoneList(metadata.tags),
    exportText,
  };
}

function buildLeadRecord(row: ContactRow): LeadRecord {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.full_name || formatPhoneNumber(row.phone_e164),
    company: parseString(metadata.company) || undefined,
    phone: formatPhoneNumber(row.phone_e164),
    email: parseString(metadata.email) || undefined,
    service: parseString(metadata.service) || parseString(metadata.intent) || 'New inquiry',
    urgency: parseString(metadata.urgency) || 'Normal',
    source: row.source ?? 'Voice assistant',
    transcriptExcerpt:
      parseString(metadata.lastSummary) ||
      parseString(metadata.notes) ||
      row.notes ||
      'Contact added to the workspace.',
    createdAt: formatDateTime(row.updated_at),
    recoveryStatus: parseString(metadata.recoveryStatus) as LeadRecord['recoveryStatus'],
    recoveryConfidence: parseNumber(metadata.recoveryConfidence) ?? undefined,
    enrichmentStatus: parseString(metadata.enrichmentStatus) as LeadRecord['enrichmentStatus'],
    owner: parseString(metadata.owner) || undefined,
    nextAction: parseString(metadata.nextAction) || undefined,
    icpPackId: parseString(metadata.icpPackId) || undefined,
    pipelineStage: parseString(row.pipeline_stage) || undefined,
    lastCallAt: row.last_call_at ? formatDateTime(row.last_call_at) : undefined,
    winStatus: parseString(row.win_status) || undefined,
    notes: row.notes ?? undefined,
    exportReady: true,
  };
}

function mapInventoryRow(row: InventoryRow, organizations: Map<string, OrganizationRow>): AssistantInventoryItem {
  const metadata = row.metadata ?? {};
  const organization = row.organization_id ? organizations.get(row.organization_id) : undefined;

  return {
    id: row.id,
    organizationId: row.organization_id ?? undefined,
    organizationName: organization?.name,
    localAgentId: row.local_agent_id ?? undefined,
    remoteAssistantId: row.remote_assistant_id,
    name: row.name,
    provider: row.provider,
    accountMode: row.account_mode,
    syncStatus: row.sync_status,
    managedBy: row.managed_by ?? undefined,
    icpPackId: row.icp_pack_id ?? undefined,
    lastSeenAt: row.last_seen_at ? formatRelativeTime(row.last_seen_at) : undefined,
    lastSyncedAt: row.last_synced_at ? formatRelativeTime(row.last_synced_at) : undefined,
    lastError: row.last_error ?? null,
    phoneNumbers: normalizePhoneList(metadata.phoneNumbers).map((value) => formatPhoneNumber(value)),
    recentCallCount: parseNumber(metadata.recentCallCount) ?? 0,
    metadata,
  };
}

function mapTemplatePack(row: TemplatePackRow): ICPTemplatePack {
  const configuration = row.configuration ?? {};
  const fallback = icpTemplatePacks.find((pack) => pack.id === row.id || pack.slug === row.slug) ?? icpTemplatePacks[0];
  const leadSchema = parseObject(getNestedValue(configuration, ['leadSchema']));
  const requiredFields = getNestedValue(leadSchema, ['requiredFields']);
  const optionalFields = getNestedValue(leadSchema, ['optionalFields']);

  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    vertical: (parseString(row.vertical, fallback.vertical) as ICPTemplatePack['vertical']) ?? fallback.vertical,
    summary: row.summary,
    positioning: parseString(configuration.positioning, fallback.positioning),
    leadSchema: {
      requiredFields: Array.isArray(requiredFields)
        ? (requiredFields as ICPTemplatePack['leadSchema']['requiredFields'])
        : fallback.leadSchema.requiredFields,
      optionalFields: Array.isArray(optionalFields)
        ? (optionalFields as ICPTemplatePack['leadSchema']['optionalFields'])
        : fallback.leadSchema.optionalFields,
    },
    gradingRubric: Array.isArray(configuration.gradingRubric)
      ? (configuration.gradingRubric as ICPTemplatePack['gradingRubric'])
      : fallback.gradingRubric,
    voicePreset: parseObject(configuration.voicePreset)
      ? (configuration.voicePreset as ICPTemplatePack['voicePreset'])
      : fallback.voicePreset,
    toolPreset: parseObject(configuration.toolPreset)
      ? (configuration.toolPreset as ICPTemplatePack['toolPreset'])
      : fallback.toolPreset,
    testScenarios: Array.isArray(configuration.testScenarios)
      ? (configuration.testScenarios as ICPTemplatePack['testScenarios'])
      : fallback.testScenarios,
    docs: parseObject(configuration.docs)
      ? (configuration.docs as ICPTemplatePack['docs'])
      : fallback.docs,
  };
}

export async function loadTemplatePacks() {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('icp_template_packs')
    .select('id, slug, label, vertical, summary, configuration')
    .eq('is_archived', false)
    .order('label', { ascending: true });

  if (result.error || !(result.data ?? []).length) {
    return icpTemplatePacks;
  }

  return (result.data as TemplatePackRow[]).map(mapTemplatePack);
}

export async function loadSupportTickets(organizationId: string) {
  const supabase = getSupabaseAdminClient();
  const [ticketResult, messageResult, profileResult] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, organization_id, agent_id, contact_id, ticket_type, status, priority, subject, description, preferred_meeting_at, created_at, updated_at, requested_by')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ticket_messages')
      .select('id, ticket_id, organization_id, author_user_id, body, is_internal, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .limit(200),
  ]);

  const tickets = (ticketResult.data ?? []) as TicketRow[];
  const messages = (messageResult.data ?? []) as TicketMessageRow[];
  const profiles = new Map(((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));

  return tickets.map((ticket) => {
    const ticketMessages = messages.filter((message) => message.ticket_id === ticket.id);

    return {
      id: ticket.id,
      organizationId: ticket.organization_id,
      agentId: ticket.agent_id ?? undefined,
      contactId: ticket.contact_id ?? undefined,
      ticketType: ticket.ticket_type,
      status: ticket.status,
      priority: ticket.priority,
      subject: ticket.subject,
      description: ticket.description,
      preferredMeetingAt: ticket.preferred_meeting_at ? formatDateTime(ticket.preferred_meeting_at) : undefined,
      requesterLabel:
        profiles.get(ticket.requested_by ?? '')?.full_name ||
        profiles.get(ticket.requested_by ?? '')?.email ||
        undefined,
      messageCount: ticketMessages.length,
      latestMessageAt: ticketMessages.at(-1)?.created_at ? formatRelativeTime(ticketMessages.at(-1)?.created_at) : undefined,
      createdAt: formatRelativeTime(ticket.created_at),
      updatedAt: formatRelativeTime(ticket.updated_at),
      messages: ticketMessages.map((message) => ({
        id: message.id,
        body: message.body,
        authorLabel:
          profiles.get(message.author_user_id ?? '')?.full_name ||
          profiles.get(message.author_user_id ?? '')?.email ||
          undefined,
        isInternal: message.is_internal,
        createdAt: formatRelativeTime(message.created_at),
      })),
    } satisfies SupportTicket;
  });
}

export async function createSupportTicket(input: {
  organizationId: string;
  agentId?: string;
  contactId?: string;
  ticketType: SupportTicket['ticketType'];
  subject: string;
  description: string;
  priority?: SupportTicket['priority'];
  preferredMeetingAt?: string;
  viewer: ViewerContext;
}) {
  const supabase = getSupabaseAdminClient();
  const ticketId = randomUUID();

  await safeInsert(supabase, 'support_tickets', {
    id: ticketId,
    organization_id: input.organizationId,
    agent_id: input.agentId ?? null,
    contact_id: input.contactId ?? null,
    requested_by: input.viewer.id,
    ticket_type: input.ticketType,
    status: input.ticketType === 'meeting' ? 'scheduled' : 'open',
    priority: input.priority ?? 'normal',
    subject: input.subject,
    description: input.description,
    preferred_meeting_at: input.preferredMeetingAt ?? null,
  });

  await safeInsert(supabase, 'ticket_messages', {
    id: randomUUID(),
    ticket_id: ticketId,
    organization_id: input.organizationId,
    author_user_id: input.viewer.id,
    body: input.description,
    is_internal: false,
  });

  const tickets = await loadSupportTickets(input.organizationId);
  return tickets.find((ticket) => ticket.id === ticketId) ?? null;
}

async function loadOrganizationsMap() {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('organizations')
    .select('id, name, slug, timezone, plan_name, is_active')
    .order('name', { ascending: true });

  return new Map(((result.data ?? []) as OrganizationRow[]).map((row) => [row.id, row]));
}

export async function loadAdminAssistantInventory() {
  const supabase = getSupabaseAdminClient();
  const organizations = await loadOrganizationsMap();
  const result = await supabase
    .from('assistant_inventory')
    .select('id, organization_id, local_agent_id, remote_assistant_id, name, provider, account_mode, sync_status, managed_by, icp_pack_id, remote_payload, metadata, last_seen_at, last_synced_at, last_error')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(250);

  const rows = (result.data ?? []) as InventoryRow[];
  return rows.map((row) => mapInventoryRow(row, organizations));
}

function deriveOrganizationId(remote: VapiAssistantRecord, localAgent?: AgentRow | null) {
  const metadata = normalizeRemoteMetadata(remote);
  return parseString(metadata.organizationId) || parseString(metadata.orgId) || localAgent?.organization_id || null;
}

function buildInventoryMetadata(input: {
  assistant: VapiAssistantRecord;
  phones: string[];
  recentCallCount: number;
  organizationId?: string | null;
}) {
  const metadata = normalizeRemoteMetadata(input.assistant);

  return {
    ...metadata,
    organizationId: input.organizationId ?? metadata.organizationId ?? null,
    icpPackId: parseString(metadata.icpPackId) || null,
    managedBy: parseString(metadata.managedBy) || null,
    phoneNumbers: input.phones,
    recentCallCount: input.recentCallCount,
  };
}

export async function syncAssistantInventory(input: {
  organizationId?: string;
  mode: 'portfolio' | 'workspace';
}) {
  const supabase = getSupabaseAdminClient();
  const credentials = await resolveVapiCredentialsForOrganization(input.organizationId);
  const syncRunResult = await supabase
    .from('assistant_sync_runs')
    .insert({
      organization_id: input.organizationId ?? null,
      mode: input.mode,
      status: 'running',
      request_metadata: {
        accountMode: credentials.mode,
        source: credentials.source,
      },
    })
    .select('id')
    .maybeSingle();
  const syncRunId = syncRunResult.data?.id as string | undefined;

  const [remoteAssistants, remotePhoneNumbers, remoteCalls, localAgentResult, organizations] = await Promise.all([
    listAssistants({ limit: 250 }, credentials.apiKey),
    listPhoneNumbers({ limit: 250 }, credentials.apiKey).catch(() => [] as VapiPhoneNumberRecord[]),
    listCalls({ limit: 250 }, credentials.apiKey).catch(() => [] as VapiCallRecord[]),
    supabase
      .from('agents')
      .select('id, organization_id, name, agent_type, vapi_assistant_id, config, vapi_sync_status, vapi_last_error, vapi_last_synced_at, vapi_last_published_at, updated_at')
      .order('created_at', { ascending: true }),
    loadOrganizationsMap(),
  ]);

  const localAgents = (localAgentResult.data ?? []) as AgentRow[];
  const localAgentByRemoteId = new Map(
    localAgents.filter((agent) => agent.vapi_assistant_id).map((agent) => [agent.vapi_assistant_id as string, agent]),
  );
  const callCounts = remoteCalls.reduce<Map<string, number>>((accumulator: Map<string, number>, call: VapiCallRecord) => {
    const assistantId = parseString(call.assistantId) || parseString(getNestedValue(parseObject(call) ?? {}, ['assistant', 'id']));

    if (!assistantId) {
      return accumulator;
    }

    accumulator.set(assistantId, (accumulator.get(assistantId) ?? 0) + 1);
    return accumulator;
  }, new Map());
  const phonesByAssistant = remotePhoneNumbers.reduce<Map<string, string[]>>((accumulator: Map<string, string[]>, phone: VapiPhoneNumberRecord) => {
    const assistantId = parseString(phone.assistantId) || parseString(getNestedValue(parseObject(phone) ?? {}, ['assistant', 'id']));

    if (!assistantId) {
      return accumulator;
    }

    const next = accumulator.get(assistantId) ?? [];
    const phoneValue = parseString(phone.number) || parseString(getNestedValue(parseObject(phone) ?? {}, ['phoneNumber', 'number']));

    if (phoneValue) {
      next.push(phoneValue);
    }

    accumulator.set(assistantId, next);
    return accumulator;
  }, new Map());

  const inventoryPayload = remoteAssistants.map((assistant: VapiAssistantRecord) => {
    const localAgent = localAgentByRemoteId.get(assistant.id);
    const organizationId = deriveOrganizationId(assistant, localAgent);
    const metadata = buildInventoryMetadata({
      assistant,
      phones: phonesByAssistant.get(assistant.id) ?? [],
      recentCallCount: callCounts.get(assistant.id) ?? 0,
      organizationId,
    });

    return {
      organization_id: organizationId,
      local_agent_id: localAgent?.id ?? null,
      api_key_id: credentials.apiKeyId ?? null,
      remote_assistant_id: assistant.id,
      name: assistant.name,
      provider: 'vapi',
      account_mode: credentials.mode,
      sync_status: 'synced',
      managed_by: parseString(metadata.managedBy) || null,
      icp_pack_id: parseString(metadata.icpPackId) || null,
      remote_payload: assistant,
      metadata,
      last_seen_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      last_error: null,
    };
  });

  if (inventoryPayload.length) {
    await safeUpsert(supabase, 'assistant_inventory', inventoryPayload, {
      onConflict: 'remote_assistant_id',
      ignoreDuplicates: false,
    });
  }

  const refreshedRowsResult = await supabase
    .from('assistant_inventory')
    .select('id, organization_id, local_agent_id, remote_assistant_id, name, provider, account_mode, sync_status, managed_by, icp_pack_id, remote_payload, metadata, last_seen_at, last_synced_at, last_error')
    .in('remote_assistant_id', remoteAssistants.map((assistant) => assistant.id));
  const refreshedRows = (refreshedRowsResult.data ?? []) as InventoryRow[];
  const inventory = refreshedRows.map((row) => mapInventoryRow(row, organizations));

  if (syncRunId) {
    await supabase
      .from('assistant_sync_runs')
      .update({
        status: 'completed',
        assistants_seen: remoteAssistants.length,
        assistants_changed: remoteAssistants.length,
        assistants_attached: inventory.filter((item) => item.organizationId).length,
        phones_seen: remotePhoneNumbers.length,
        calls_seen: remoteCalls.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRunId);
  }

  return {
    runId: syncRunId,
    mode: input.mode,
    assistantsSeen: remoteAssistants.length,
    assistantsChanged: remoteAssistants.length,
    assistantsAttached: inventory.filter((item) => item.organizationId).length,
    phonesSeen: remotePhoneNumbers.length,
    callsSeen: remoteCalls.length,
    inventory,
  } satisfies SyncSummary;
}

export async function importAssistantToWorkspace(input: {
  assistantId: string;
  organizationId?: string;
  mode?: 'import' | 'attach' | 'clone' | 'archive';
}) {
  const supabase = getSupabaseAdminClient();

  if (input.mode === 'archive') {
    const update = await supabase
      .from('assistant_inventory')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', input.assistantId)
      .select('id')
      .maybeSingle();

    return {
      ok: Boolean(update.data),
      archivedInventoryId: update.data?.id ?? null,
    };
  }

  const credentials = await resolveVapiCredentialsForOrganization(input.organizationId);
  const remote = await getAssistant(input.assistantId, credentials.apiKey);
  const role = guessAgentRole(remote);
  const organizationId = input.organizationId ?? deriveOrganizationId(remote, null) ?? null;

  let remoteAssistant = remote;

  if (input.mode === 'clone') {
    if (!organizationId) {
      throw new Error('An organization is required to clone an assistant into a workspace.');
    }

    const cloned = await createAssistant(
      {
        ...remote,
        name: `${remote.name} Copy`,
        metadata: {
          ...(normalizeRemoteMetadata(remote) ?? {}),
          organizationId,
          clonedFromAssistantId: remote.id,
        },
      },
      undefined,
      credentials.apiKey,
    );
    remoteAssistant = await getAssistant(cloned.id, credentials.apiKey);
  }

  const inventoryMetadata = buildInventoryMetadata({
    assistant: remoteAssistant,
    phones: [],
    recentCallCount: 0,
    organizationId,
  });

  await safeUpsert(supabase, 'assistant_inventory', {
    organization_id: organizationId,
    remote_assistant_id: remoteAssistant.id,
    name: remoteAssistant.name,
    provider: 'vapi',
    account_mode: credentials.mode,
    sync_status: 'synced',
    managed_by: parseString(inventoryMetadata.managedBy) || null,
    icp_pack_id: parseString(inventoryMetadata.icpPackId) || null,
    remote_payload: remoteAssistant,
    metadata: inventoryMetadata,
    last_seen_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }, {
    onConflict: 'remote_assistant_id',
    ignoreDuplicates: false,
  });

  let localAgentId: string | null = null;

  if (organizationId) {
    const existingAgentResult = await supabase
      .from('agents')
      .select('id')
      .eq('vapi_assistant_id', remoteAssistant.id)
      .maybeSingle();

    if (existingAgentResult.data?.id) {
      localAgentId = existingAgentResult.data.id as string;
      await supabase
        .from('agents')
        .update({
          organization_id: organizationId,
          name: remoteAssistant.name,
          agent_type: role,
          config: {
            ...buildPersistedAssistantConfig(remoteAssistant as VapiAssistantPayload, {
              accountMode: credentials.mode,
              purpose: buildAssistantPurpose(role),
              icpPackId: parseString(inventoryMetadata.icpPackId) || undefined,
            }),
          },
          vapi_sync_status: 'synced',
          vapi_last_error: null,
          vapi_last_synced_at: new Date().toISOString(),
          vapi_last_published_at: new Date().toISOString(),
        })
        .eq('id', localAgentId);
    } else {
      const insert = await supabase
        .from('agents')
        .insert({
          organization_id: organizationId,
          name: remoteAssistant.name,
          agent_type: role,
          vapi_assistant_id: remoteAssistant.id,
          is_active: true,
          config: buildPersistedAssistantConfig(remoteAssistant as VapiAssistantPayload, {
            accountMode: credentials.mode,
            purpose: buildAssistantPurpose(role),
            icpPackId: parseString(inventoryMetadata.icpPackId) || undefined,
          }),
          vapi_sync_status: 'synced',
          vapi_last_error: null,
          vapi_last_synced_at: new Date().toISOString(),
          vapi_last_published_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insert.error || !insert.data) {
        throw new Error(insert.error?.message ?? 'Unable to create the local assistant record.');
      }

      localAgentId = insert.data.id as string;
      await safeInsert(supabase, 'agent_revisions', {
        organization_id: organizationId,
        agent_id: localAgentId,
        action: 'synced',
        version: 1,
        draft_payload: remoteAssistant,
        live_payload: remoteAssistant,
        note: `Imported from Vapi assistant ${remoteAssistant.id}`,
      });
    }

    await supabase
      .from('assistant_inventory')
      .update({
        organization_id: organizationId,
        local_agent_id: localAgentId,
        last_synced_at: new Date().toISOString(),
      })
      .eq('remote_assistant_id', remoteAssistant.id);
  }

  return {
    remoteAssistantId: remoteAssistant.id,
    localAgentId,
    organizationId,
    mode: input.mode ?? 'import',
  };
}

export async function loadAssistantCalls(agentId: string) {
  const supabase = getSupabaseAdminClient();
  const agentResult = await supabase
    .from('agents')
    .select('id, organization_id, name, vapi_assistant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (agentResult.error || !agentResult.data) {
    throw new Error(agentResult.error?.message ?? 'Assistant not found.');
  }

  const agent = agentResult.data as { id: string; organization_id: string; name: string; vapi_assistant_id?: string | null };
  const organizationResult = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', agent.organization_id)
    .maybeSingle();
  const organizationName = parseString(organizationResult.data?.name, 'Workspace');
  const callResult = await supabase
    .from('calls')
    .select('id, organization_id, agent_id, vapi_assistant_id, vapi_call_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at, started_at, ended_at, recording_url, transcript_json, cost_usd, latency_ms, disposition, win_status')
    .eq('organization_id', agent.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (callResult.data ?? []) as CallRow[];
  return rows
    .filter((row) => row.agent_id === agent.id || row.vapi_assistant_id === agent.vapi_assistant_id)
    .map((row) => buildRecentCall(row, organizationName));
}

export async function loadAssistantStats(agentId: string) {
  const supabase = getSupabaseAdminClient();
  const agentResult = await supabase
    .from('agents')
    .select('id, organization_id, name, vapi_assistant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (agentResult.error || !agentResult.data) {
    throw new Error(agentResult.error?.message ?? 'Assistant not found.');
  }

  const agent = agentResult.data as { id: string; organization_id: string; name: string; vapi_assistant_id?: string | null };
  const [organizationResult, callResult, phoneNumbers] = await Promise.all([
    supabase
      .from('organizations')
      .select('name')
      .eq('id', agent.organization_id)
      .maybeSingle(),
    supabase
      .from('calls')
      .select('id, organization_id, agent_id, vapi_assistant_id, vapi_call_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at, started_at, ended_at, recording_url, transcript_json, cost_usd, latency_ms, disposition, win_status')
      .eq('organization_id', agent.organization_id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('phone_numbers')
      .select('phone_e164, friendly_name')
      .eq('organization_id', agent.organization_id)
      .eq('is_active', true),
  ]);
  const organizationName = parseString(organizationResult.data?.name, 'Workspace');
  const callRows = ((callResult.data ?? []) as CallRow[]).filter(
    (row) => row.agent_id === agent.id || row.vapi_assistant_id === agent.vapi_assistant_id,
  );
  const calls = callRows.map((row) => buildRecentCall(row, organizationName));

  let analyticsCost = 0;

  if (agent.vapi_assistant_id) {
    try {
      const credentials = await resolveVapiCredentialsForOrganization(agent.organization_id);
      const analytics = await runAnalyticsQueries(
        [
          {
            name: 'assistant-overview',
            table: 'call',
            timeRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
              step: 'day',
              timezone: 'UTC',
            },
            operations: [
              { operation: 'sum', column: 'cost' },
            ],
            filters: [
              { column: 'assistantId', operator: 'eq', value: agent.vapi_assistant_id },
            ],
          },
        ],
        credentials.apiKey,
      );

      analyticsCost = parseNumber(analytics[0]?.result?.[0]?.value) ?? 0;
    } catch {
      analyticsCost = 0;
    }
  }

  const totalDurationSeconds = callRows.reduce((sum: number, call: CallRow) => sum + (call.duration_seconds ?? 0), 0);
  const fallbackDurationSeconds = calls.reduce((sum: number, call: RecentCall) => sum + parseDurationLabel(call.duration), 0);
  const costFromCalls = callRows.reduce((sum: number, call: CallRow) => sum + (call.cost_usd ?? 0), 0);
  const latencySamples = callRows
    .map((call: CallRow) => call.latency_ms)
    .filter((value): value is number => typeof value === 'number');
  const transcriptCoverage = calls.length
    ? calls.filter((call) => call.transcript.length > 0).length / calls.length
    : 0;
  const callOutcomeBreakdown: AssistantStats['callOutcomeBreakdown'] = Array.from(
    callRows.reduce<Map<string, number>>((accumulator: Map<string, number>, call: CallRow) => {
      const label = call.disposition ?? call.call_status.replace(/_/g, ' ');
      accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
      return accumulator;
    }, new Map()).entries(),
  ).map(([label, count]: [string, number]) => ({ label, count }));
  const phoneRows = (phoneNumbers.data ?? []) as PhoneNumberRow[];

  return {
    agentId: agent.id,
    organizationId: agent.organization_id,
    remoteAssistantId: agent.vapi_assistant_id ?? undefined,
    totalCalls: calls.length,
    bookedCalls: callRows.filter((call) => (call.disposition ?? call.call_status).toLowerCase().includes('book')).length,
    wonCalls: callRows.filter((call) => call.win_status === 'won' || (call.disposition ?? call.call_status).toLowerCase().includes('won')).length,
    averageDurationSeconds: calls.length ? Math.round((totalDurationSeconds || fallbackDurationSeconds) / calls.length) : 0,
    totalDurationSeconds: totalDurationSeconds || fallbackDurationSeconds,
    totalCostUsd: Number((costFromCalls || analyticsCost).toFixed(4)),
    averageLatencyMs: latencySamples.length
      ? Math.round(latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length)
      : 0,
    lastCallAt: callRows[0]?.started_at ? formatDateTime(callRows[0].started_at) : calls[0]?.startedAt,
    phoneNumbers: phoneRows.map((row) => formatPhoneNumber(row.phone_e164 ?? row.friendly_name ?? '')),
    transcriptCoverage,
    callOutcomeBreakdown,
  } satisfies AssistantStats;
}

async function loadAssistantDemoBlueprint(input: {
  organizationId: string;
  localAgentId: string;
  remoteAssistantId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from('demo_blueprints')
    .select('id, organization_id, title, website_url, created_at, status, knowledge_pack_slug, query_tool_id, vapi_assistant_id, kb_sync_status, last_test_call_id, last_test_call_at, embed_snippet')
    .eq('organization_id', input.organizationId)
    .or(`local_agent_id.eq.${input.localAgentId}${input.remoteAssistantId ? `,vapi_assistant_id.eq.${input.remoteAssistantId}` : ''}`)
    .order('created_at', { ascending: false })
    .limit(1);

  const blueprint = ((result.data ?? [])[0] as DemoBlueprintRow | undefined) ?? null;

  if (!blueprint) {
    return null;
  }

  const assetResult = await supabase
    .from('demo_blueprint_assets')
    .select('id, demo_blueprint_id, asset_type, source_label, source_url, file_name, file_ext, mime_type, storage_path, byte_size, vapi_file_id, sync_status, created_at, metadata')
    .eq('demo_blueprint_id', blueprint.id)
    .order('created_at', { ascending: true });
  const assets = ((assetResult.data ?? []) as DemoBlueprintAssetRow[]).map(normalizeKnowledgeAssetRow);

  return {
    id: blueprint.id,
    organizationId: blueprint.organization_id,
    title: blueprint.title,
    websiteUrl: blueprint.website_url ?? undefined,
    createdAt: formatRelativeTime(blueprint.created_at),
    status: (blueprint.status as DemoBlueprintSummary['status']) ?? undefined,
    knowledgePackSlug: blueprint.knowledge_pack_slug ?? undefined,
    queryToolId: blueprint.query_tool_id ?? undefined,
    vapiAssistantId: blueprint.vapi_assistant_id ?? undefined,
    kbSyncStatus: (blueprint.kb_sync_status as DemoBlueprintSummary['kbSyncStatus']) ?? undefined,
    uploadedAssets: assets,
    lastTestCallId: blueprint.last_test_call_id ?? undefined,
    lastTestCallAt: blueprint.last_test_call_at ? formatDateTime(blueprint.last_test_call_at) : undefined,
    embedSnippet: blueprint.embed_snippet ?? undefined,
  } satisfies DemoBlueprintSummary;
}

export async function loadAssistantDetail(agentId: string) {
  const supabase = getSupabaseAdminClient();
  const agentResult = await supabase
    .from('agents')
    .select('id, organization_id, name, agent_type, vapi_assistant_id, config, vapi_sync_status, vapi_last_error, vapi_last_synced_at, vapi_last_published_at, updated_at')
    .eq('id', agentId)
    .maybeSingle();

  if (agentResult.error || !agentResult.data) {
    throw new Error(agentResult.error?.message ?? 'Assistant not found.');
  }

  const agent = agentResult.data as AgentRow;
  const [calls, stats, tickets, revisionsResult, demoBlueprint] = await Promise.all([
    loadAssistantCalls(agent.id),
    loadAssistantStats(agent.id),
    loadSupportTickets(agent.organization_id),
    supabase
      .from('agent_revisions')
      .select('id, action, version, created_at, note')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(8),
    loadAssistantDemoBlueprint({
      organizationId: agent.organization_id,
      localAgentId: agent.id,
      remoteAssistantId: agent.vapi_assistant_id,
    }),
  ]);
  const revisions = (revisionsResult.data ?? []) as RevisionRow[];
  const config = normalizeAssistantConfig(agent.config, agent.name);

  const detailAgent: DashboardAgent & { revisions: RevisionRow[] } = {
      id: agent.id,
      organizationId: agent.organization_id,
      name: agent.name,
      role: guessAgentRole({
        ...(config.livePayload as VapiAssistantPayload),
        id: agent.vapi_assistant_id ?? agent.id,
        name: agent.name,
      } as VapiAssistantRecord),
      vapiAssistantId: agent.vapi_assistant_id ?? undefined,
      voice: config.draftPayload.voice.voiceId,
      model: config.draftPayload.model.model,
      status: 'live' as const,
      purpose: buildAssistantPurpose(guessAgentRole({
        ...(config.livePayload as VapiAssistantPayload),
        id: agent.vapi_assistant_id ?? agent.id,
        name: agent.name,
      } as VapiAssistantRecord)),
      lastSyncedAt: formatRelativeTime(agent.vapi_last_synced_at ?? agent.updated_at),
      syncStatus: (agent.vapi_sync_status as DashboardAgent['syncStatus']) ?? config.syncStatus,
      lastError: agent.vapi_last_error ?? config.lastError ?? null,
      accountMode: config.accountMode,
      config,
      draftPayload: config.draftPayload,
      livePayload: config.livePayload,
      phoneNumbers: stats.phoneNumbers,
      recentCallCount: stats.totalCalls,
      ticketCount: tickets.length,
      lastCallAt: calls[0]?.startedAt ?? null,
      lastPublishedAt: agent.vapi_last_published_at ?? null,
      demoBlueprintId: demoBlueprint?.id,
      knowledgePackSlug: demoBlueprint?.knowledgePackSlug,
      queryToolId: demoBlueprint?.queryToolId,
      kbSyncStatus: demoBlueprint?.kbSyncStatus,
      embedSnippet: demoBlueprint?.embedSnippet ?? null,
      knowledgeAssets: demoBlueprint?.uploadedAssets,
      lastTestCallAt: demoBlueprint?.lastTestCallAt ?? null,
      stats,
      revisions,
  };

  return {
    agent: detailAgent,
    calls,
    stats,
    tickets: tickets.filter((ticket) => ticket.agentId === agent.id),
    demoBlueprint,
  };
}

export async function buildExportArtifact(input: {
  organizationId: string;
  exportType: string;
}) {
  const supabase = getSupabaseAdminClient();
  const organizationResult = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', input.organizationId)
    .maybeSingle();
  const organizationName = parseString(organizationResult.data?.name, 'workspace');

  if (input.exportType === 'leads-csv') {
    const result = await supabase
      .from('contacts')
      .select('id, organization_id, full_name, phone_e164, source, metadata, updated_at, pipeline_stage, last_call_at, win_status, notes')
      .eq('organization_id', input.organizationId)
      .order('updated_at', { ascending: false });
    const leads = ((result.data ?? []) as ContactRow[]).map((row) => buildLeadRecord(row));
    const header = ['Name', 'Phone', 'Email', 'Service', 'Stage', 'Win Status', 'Last Call', 'Notes'];
    const rows = leads.map((lead) => [
      lead.name,
      lead.phone ?? '',
      lead.email ?? '',
      lead.service,
      lead.pipelineStage ?? '',
      lead.winStatus ?? '',
      lead.lastCallAt ?? '',
      lead.notes ?? '',
    ]);

    return {
      fileName: `${organizationName.toLowerCase().replace(/\s+/g, '-')}-leads.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: [header, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\n'),
    };
  }

  if (input.exportType === 'calls-json') {
    const calls = await supabase
      .from('calls')
      .select('id, organization_id, agent_id, vapi_assistant_id, vapi_call_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at, started_at, ended_at, recording_url, transcript_json, cost_usd, latency_ms, disposition, win_status')
      .eq('organization_id', input.organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    return {
      fileName: `${organizationName.toLowerCase().replace(/\s+/g, '-')}-calls.json`,
      mimeType: 'application/json;charset=utf-8',
      content: JSON.stringify(calls.data ?? [], null, 2),
    };
  }

  const tickets = await loadSupportTickets(input.organizationId);

  return {
    fileName: `${organizationName.toLowerCase().replace(/\s+/g, '-')}-tickets.json`,
    mimeType: 'application/json;charset=utf-8',
    content: JSON.stringify(tickets, null, 2),
  };
}

export async function recordExportJob(input: {
  organizationId: string;
  viewer: ViewerContext;
  exportType: string;
  fileName: string;
  mimeType: string;
}) {
  const supabase = getSupabaseAdminClient();
  const id = randomUUID();

  await safeInsert(supabase, 'export_jobs', {
    id,
    organization_id: input.organizationId,
    requested_by: input.viewer.id,
    export_type: input.exportType,
    status: 'completed',
    file_name: input.fileName,
    mime_type: input.mimeType,
    completed_at: new Date().toISOString(),
  });

  return id;
}

export function getViewerOrganizationId(viewer: ViewerContext, organizationId?: string | null) {
  return organizationId ?? getDefaultOrganizationId(viewer);
}

export function canViewerAccessOrganization(viewer: ViewerContext, organizationId: string) {
  return viewer.isPlatformAdmin || viewer.memberships.some((membership) => membership.organizationId === organizationId);
}
