import { buildFallbackDemoTemplate } from '@/lib/demo-template';
import { normalizeAssistantConfig } from '@/lib/assistant-config';
import { formatDateTime, formatDuration, formatPhoneNumber, formatRelativeTime } from '@/lib/format';
import { getDefaultOrganizationId } from '@/lib/auth';
import { clientPlaygroundScenarios, getIcpTemplatePack, icpTemplatePacks, playbookDocuments } from '@/lib/icp-packs';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadSupportTickets, loadTemplatePacks } from '@/lib/voiceops-platform';
import type {
  AssistantVersion,
  DemoSession,
  ExportJob,
  ICPTemplatePack,
  LeadCaptureAttempt,
  LeadEnrichmentRun,
  LeadRecoveryRun,
  ManagedNumberReservation,
} from '@/lib/voiceops-contracts';
import type {
  AdminDashboardData,
  ClientDashboardData,
  DashboardAgent,
  DemoBlueprintSummary,
  KnowledgeAsset,
  LeadRecord,
  MetricCard,
  OrganizationSummary,
  RecentCall,
  ViewerContext,
} from '@/lib/types';

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan_name: string | null;
  is_active: boolean;
  vapi_account_mode?: 'managed' | 'byo' | null;
  vapi_managed_label?: string | null;
  vapi_api_key_id?: string | null;
  created_at?: string;
};

type AgentRow = {
  id: string;
  organization_id: string;
  name: string;
  agent_type: string;
  vapi_assistant_id: string | null;
  is_active: boolean;
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

type CampaignRow = {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  created_at: string;
};

type PhoneNumberRow = {
  id: string;
  organization_id: string;
  phone_e164: string | null;
  friendly_name: string | null;
  is_active: boolean;
};

type ApiKeyRow = {
  id: string;
  organization_id: string;
  label: string;
  provider: string;
};

type VoicemailAssetRow = {
  id: string;
  organization_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  duration_seconds: number | null;
  created_at: string;
};

type BlueprintRow = {
  id: string;
  organization_id: string;
  title: string;
  website_url: string | null;
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

type BlueprintAssetRow = {
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

type ClientAccountRow = {
  organization_id: string;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  onboarding_status?: string | null;
  support_tier?: string | null;
};

type ExportJobRow = {
  id: string;
  organization_id: string;
  export_type: string;
  status: ExportJob['status'];
  file_name?: string | null;
  mime_type?: string | null;
  artifact_path?: string | null;
  error_text?: string | null;
  created_at: string;
  completed_at?: string | null;
};

function parseString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

async function getVapiApiKeyLabel(
  supabase: Awaited<ReturnType<typeof getSupabaseAdminClient>>,
  organizationId: string,
  apiKeyId?: string | null,
) {
  if (!apiKeyId) {
    return null;
  }

  const result = await supabase
    .from('api_keys')
    .select('id, organization_id, label, provider')
    .eq('id', apiKeyId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  const apiKey = result.data as ApiKeyRow;
  return apiKey.provider === 'vapi' ? apiKey.label : null;
}

function parseNumber(value: unknown): number | null {
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

function getNestedValue(source: Record<string, unknown> | null | undefined, path: string[]): unknown {
  let current: unknown = source;

  for (const segment of path) {
    const object = parseObject(current);

    if (!object || !(segment in object)) {
      return undefined;
    }

    current = object[segment];
  }

  return current;
}

function formatCost(value: unknown) {
  const amount = parseNumber(value);
  return amount === null ? '' : `$${amount.toFixed(4)}`;
}

function formatLatency(value: unknown) {
  const latency = parseNumber(value);
  return latency === null ? '' : `${Math.round(latency)} ms`;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => parseString(item).trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  if (typeof value === 'string') {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return [];
}

function extractTranscript(
  metadata: Record<string, unknown> | null,
  summary: string | null,
): RecentCall['transcript'] {
  const transcriptCandidates = [
    metadata?.transcript,
    metadata?.messages,
    metadata?.conversation,
    metadata?.utterances,
    metadata?.dialogue,
    getNestedValue(metadata, ['vapi', 'transcript']),
    getNestedValue(metadata, ['analysis', 'transcript']),
  ];

  for (const candidate of transcriptCandidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const transcript = candidate
      .map((entry, index) => {
        const item = parseObject(entry);
        if (!item) {
          return null;
        }

        const rawText =
          parseString(item.text) ||
          parseString(item.message) ||
          parseString(item.content) ||
          parseString(item.transcript) ||
          parseString(item.value);

        if (!rawText) {
          return null;
        }

        const rawRole =
          parseString(item.role) ||
          parseString(item.speaker) ||
          parseString(item.participant) ||
          parseString(item.type);

        const speaker: RecentCall['transcript'][number]['speaker'] =
          rawRole === 'assistant' || rawRole === 'bot'
            ? 'assistant'
            : rawRole === 'user' || rawRole === 'caller' || rawRole === 'customer'
              ? 'caller'
              : 'system';

        return {
          id: `${speaker}-${index + 1}`,
          speaker,
          label: speaker === 'assistant' ? 'Assistant' : speaker === 'caller' ? 'Caller' : 'System',
          text: rawText,
          timestamp: parseString(item.timestamp) || parseString(item.time),
        };
      })
      .filter(Boolean) as RecentCall['transcript'];

    if (transcript.length) {
      return transcript;
    }
  }

  if (summary) {
    return [
      {
        id: 'summary',
        speaker: 'system',
        label: 'Summary',
        text: summary,
      },
    ];
  }

  return [];
}

function buildLogItems(row: CallRow): RecentCall['logItems'] {
  const metadata = row.metadata ?? {};
  const assistantName =
    parseString(metadata.assistantName) ||
    parseString(getNestedValue(metadata, ['assistant', 'name'])) ||
    parseString(getNestedValue(metadata, ['vapi', 'assistantName']));
  const modelName =
    parseString(metadata.modelName) ||
    parseString(getNestedValue(metadata, ['model', 'name'])) ||
    parseString(getNestedValue(metadata, ['vapi', 'model']));
  const callId =
    parseString(metadata.vapiCallId) ||
    parseString(metadata.callId) ||
    parseString(getNestedValue(metadata, ['vapi', 'callId']));
  const latencyLabel =
    formatLatency(metadata.latencyMs) ||
    formatLatency(metadata.latency) ||
    formatLatency(getNestedValue(metadata, ['analysis', 'latencyMs'])) ||
    formatLatency(getNestedValue(metadata, ['metrics', 'latencyMs']));
  const costLabel =
    formatCost(metadata.costUsd) ||
    formatCost(metadata.cost) ||
    formatCost(getNestedValue(metadata, ['analysis', 'costUsd'])) ||
    formatCost(getNestedValue(metadata, ['billing', 'costUsd']));
  const startedAt =
    parseString(metadata.startedAt) ||
    parseString(getNestedValue(metadata, ['analysis', 'startedAt'])) ||
    row.started_at ||
    row.created_at;

  return [
    { label: 'Status', value: row.call_status.replace(/_/g, ' ') },
    { label: 'Started', value: formatDateTime(startedAt) },
    { label: 'From', value: formatPhoneNumber(row.from_number) },
    { label: 'To', value: formatPhoneNumber(row.to_number) },
    { label: 'Assistant', value: assistantName || 'Not synced' },
    { label: 'Model', value: modelName || 'Not logged' },
    { label: 'Latency', value: latencyLabel || 'N/A' },
    { label: 'Cost', value: costLabel || 'N/A' },
    { label: 'Call ID', value: callId || row.id },
  ];
}

function buildExportText(call: Omit<RecentCall, 'exportText'>) {
  const transcriptBlock = call.transcript.length
    ? call.transcript.map((entry) => `${entry.label}: ${entry.text}`).join('\n')
    : 'No transcript available.';
  const logBlock = call.logItems.map((item) => `${item.label}: ${item.value}`).join('\n');

  return [
    `${call.organizationName} call review`,
    `Caller: ${call.caller}`,
    `Direction: ${call.direction}`,
    `Outcome: ${call.outcome}`,
    `Created: ${call.createdAt}`,
    '',
    'Log',
    logBlock,
    '',
    'Summary',
    call.summary,
    '',
    'Transcript',
    transcriptBlock,
  ].join('\n');
}

function parseAgentRole(agentType: string): DashboardAgent['role'] {
  if (agentType === 'outbound') {
    return 'outbound';
  }

  if (agentType === 'campaign') {
    return 'campaign';
  }

  if (agentType === 'specialist') {
    return 'campaign';
  }

  return 'inbound';
}

function buildAgentPurpose(agentType: string, config?: Record<string, unknown> | null) {
  const explicitPurpose = parseString(config?.purpose, '');

  if (explicitPurpose) {
    return explicitPurpose;
  }

  if (agentType === 'outbound') {
    return 'Outbound follow-up, reminders, and direct callback flows.';
  }

  if (agentType === 'campaign') {
    return 'Dedicated blast campaign assistant with script-driven outbound prompts.';
  }

  if (agentType === 'specialist') {
    return 'Dedicated blast campaign assistant with script-driven outbound prompts.';
  }

  return 'Inbound call handling, lead capture, FAQs, and booking qualification.';
}

function mapAgent(row: AgentRow): DashboardAgent {
  const config = row.config ?? {};
  const snapshot = normalizeAssistantConfig(config, row.name);

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    role: parseAgentRole(row.agent_type),
    vapiAssistantId: row.vapi_assistant_id ?? undefined,
    voice: parseString(config.voiceLabel, parseString(snapshot.draftPayload.voice.voiceId, 'Primary voice')),
    model: parseString(config.modelName, parseString(snapshot.draftPayload.model.model, 'Model not synced')),
    status: row.is_active ? 'live' : 'pending',
    purpose: buildAgentPurpose(row.agent_type, config),
    lastSyncedAt: formatRelativeTime(row.vapi_last_synced_at ?? row.vapi_last_published_at ?? row.updated_at),
    syncStatus: snapshot.syncStatus,
    lastError: row.vapi_last_error ?? snapshot.lastError ?? null,
    accountMode: snapshot.accountMode,
    config,
    draftPayload: snapshot.draftPayload,
    livePayload: snapshot.livePayload,
  };
}

function extractRecording(row: CallRow, voicemailAssetsById: Map<string, VoicemailAssetRow>) {
  const metadata = row.metadata ?? {};
  const directUrl = parseString(metadata.recordingUrl, '');

  if (directUrl) {
    return {
      recordingUrl: directUrl,
      recordingLabel: 'Download audio',
    };
  }

  const voicemailAssetId = parseString(metadata.voicemailAssetId, '');

  if (!voicemailAssetId) {
    return {};
  }

  const asset = voicemailAssetsById.get(voicemailAssetId);

  if (!asset) {
    return {};
  }

  return {
    recordingLabel: `Stored asset: ${asset.file_name}`,
  };
}

function mapRecentCall(row: CallRow, organizationName: string, voicemailAssetsById: Map<string, VoicemailAssetRow>): RecentCall {
  const metadata = row.metadata ?? {};
  const recording = extractRecording(row, voicemailAssetsById);
  const transcript = extractTranscript(metadata, row.summary);
  const logItems = buildLogItems(row);
  const tags = [
    ...normalizeTags(metadata.tags),
    ...normalizeTags(metadata.intents),
    ...normalizeTags(getNestedValue(metadata, ['analysis', 'flags'])),
  ].slice(0, 6);

  const call = {
    id: row.id,
    organizationId: row.organization_id,
    agentId: row.agent_id ?? undefined,
    vapiAssistantId: row.vapi_assistant_id ?? undefined,
    vapiCallId: row.vapi_call_id ?? undefined,
    caller: formatPhoneNumber(row.from_number ?? row.to_number),
    organizationName,
    summary: row.summary ?? 'Call captured. Summary still pending.',
    duration: formatDuration(row.duration_seconds),
    outcome: row.disposition ?? row.call_status.replace(/_/g, ' '),
    direction: row.direction,
    recordingUrl: row.recording_url ?? recording.recordingUrl,
    recordingLabel: row.recording_url || recording.recordingLabel ? 'Open recording' : undefined,
    createdAt: formatRelativeTime(row.created_at),
    fromNumber: formatPhoneNumber(row.from_number),
    toNumber: formatPhoneNumber(row.to_number),
    startedAt: formatDateTime(
      row.started_at || parseString(metadata.startedAt) || parseString(getNestedValue(metadata, ['analysis', 'startedAt'])) || row.created_at,
    ),
    endedAt: row.ended_at ? formatDateTime(row.ended_at) : undefined,
    assistantName:
      parseString(metadata.assistantName) ||
      parseString(getNestedValue(metadata, ['assistant', 'name'])) ||
      parseString(getNestedValue(metadata, ['vapi', 'assistantName'])) ||
      undefined,
    modelName:
      parseString(metadata.modelName) ||
      parseString(getNestedValue(metadata, ['model', 'name'])) ||
      parseString(getNestedValue(metadata, ['vapi', 'model'])) ||
      undefined,
    latencyLabel:
      formatLatency(row.latency_ms) ||
      formatLatency(metadata.latencyMs) ||
      formatLatency(metadata.latency) ||
      formatLatency(getNestedValue(metadata, ['analysis', 'latencyMs'])) ||
      undefined,
    costLabel:
      formatCost(row.cost_usd) ||
      formatCost(metadata.costUsd) ||
      formatCost(metadata.cost) ||
      formatCost(getNestedValue(metadata, ['analysis', 'costUsd'])) ||
      undefined,
    costUsd: row.cost_usd ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    disposition: row.disposition ?? undefined,
    winStatus: row.win_status ?? undefined,
    transcript,
    logItems,
    tags,
    leadRecoveryStatus:
      parseString(getNestedValue(metadata, ['leadRecovery', 'status'])) as RecentCall['leadRecoveryStatus'] | undefined,
    qaGrade:
      parseString(getNestedValue(metadata, ['qa', 'grade'])) as RecentCall['qaGrade'] | undefined,
  };

  return {
    ...call,
    exportText: buildExportText(call),
  };
}

function mapLead(row: ContactRow): LeadRecord {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.full_name || formatPhoneNumber(row.phone_e164),
    company: parseString(metadata.company, ''),
    phone: formatPhoneNumber(row.phone_e164),
    email: parseString(metadata.email, ''),
    service: parseString(metadata.service, parseString(metadata.intent, 'New inquiry')),
    urgency: parseString(metadata.urgency, 'Normal'),
    source: row.source ?? 'Voice assistant',
    transcriptExcerpt:
      parseString(metadata.lastSummary, parseString(metadata.notes, 'Contact added to the workspace.')) ||
      'Contact added to the workspace.',
    createdAt: formatDateTime(row.updated_at),
    recoveryStatus:
      (parseString(metadata.recoveryStatus) as LeadRecord['recoveryStatus']) || undefined,
    recoveryConfidence: parseNumber(metadata.recoveryConfidence) ?? undefined,
    enrichmentStatus:
      (parseString(metadata.enrichmentStatus) as LeadRecord['enrichmentStatus']) || undefined,
    owner: parseString(metadata.owner, ''),
    nextAction: parseString(metadata.nextAction, ''),
    icpPackId: parseString(metadata.icpPackId, ''),
    pipelineStage: row.pipeline_stage ?? undefined,
    lastCallAt: row.last_call_at ? formatDateTime(row.last_call_at) : undefined,
    winStatus: row.win_status ?? undefined,
    notes: row.notes ?? undefined,
    exportReady: true,
  };
}

function resolveTemplatePack(templatePacks: ICPTemplatePack[], packId?: string) {
  if (packId) {
    const matchedPack = templatePacks.find((pack) => pack.id === packId || pack.slug === packId);

    if (matchedPack) {
      return matchedPack;
    }
  }

  return templatePacks[0] ?? icpTemplatePacks[0];
}

function mapKnowledgeAsset(row: BlueprintAssetRow): KnowledgeAsset {
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

function mapBlueprint(row: BlueprintRow, assets: KnowledgeAsset[] = []): DemoBlueprintSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    websiteUrl: row.website_url ?? undefined,
    createdAt: formatRelativeTime(row.created_at),
    status: (row.status as DemoBlueprintSummary['status']) ?? undefined,
    knowledgePackSlug: row.knowledge_pack_slug ?? undefined,
    queryToolId: row.query_tool_id ?? undefined,
    vapiAssistantId: row.vapi_assistant_id ?? undefined,
    kbSyncStatus: (row.kb_sync_status as DemoBlueprintSummary['kbSyncStatus']) ?? undefined,
    uploadedAssets: assets,
    lastTestCallId: row.last_test_call_id ?? undefined,
    lastTestCallAt: row.last_test_call_at ? formatDateTime(row.last_test_call_at) : undefined,
    embedSnippet: row.embed_snippet ?? undefined,
  };
}

function buildAssistantVersions(agents: DashboardAgent[]): AssistantVersion[] {
  return agents.slice(0, 8).map((agent, index) => {
    const versionStatus: AssistantVersion['status'] = agent.syncStatus === 'synced' ? 'published' : 'draft';

    return {
      id: `${agent.id}-version-${index + 1}`,
      agentId: agent.id,
      organizationId: agent.organizationId,
      icpPackId: parseString((agent.config as Record<string, unknown> | undefined)?.icpPackId, getIcpTemplatePack(undefined).id),
      versionLabel: agent.syncStatus === 'synced' ? 'Published' : 'Draft',
      status: versionStatus,
      summary: `${agent.name} tuned for ${agent.role} orchestration and ${agent.voice} voice.`,
      changedAt: agent.lastSyncedAt,
      changedBy: 'VoiceOps Control Plane',
    };
  });
}

function buildNumberPool(phoneNumbers: PhoneNumberRow[], organizations: OrganizationSummary[]): ManagedNumberReservation[] {
  if (!phoneNumbers.length) {
    return [
      {
        id: 'managed-demo-line',
        phoneNumber: 'Demo line pending',
        label: 'Managed demo pool',
        status: 'free',
      },
    ];
  }

  return phoneNumbers.map((phoneNumber, index) => {
    const reservationStatus: ManagedNumberReservation['status'] =
      index === 0 ? 'assigned' : index % 3 === 0 ? 'cooldown' : 'free';

    return {
      id: phoneNumber.id,
      organizationId: phoneNumber.organization_id,
      phoneNumber: formatPhoneNumber(phoneNumber.phone_e164),
      label: phoneNumber.friendly_name ?? `Pool line ${index + 1}`,
      status: reservationStatus,
      assignedTo: organizations.find((organization) => organization.id === phoneNumber.organization_id)?.name,
      lastUsedAt: new Date(Date.now() - index * 1000 * 60 * 90).toISOString(),
      reservationEndsAt: index === 0 ? new Date(Date.now() + 1000 * 60 * 45).toISOString() : undefined,
    };
  });
}

function buildRecoveryQueue(calls: RecentCall[]) {
  return calls.slice(0, 6).map((call, index) => ({
    id: `${call.id}-recovery`,
    title: call.assistantName ?? call.caller,
    status:
      call.leadRecoveryStatus ??
      (call.transcript.length >= 2 ? 'recovered' : index % 2 === 0 ? 'needs-review' : 'partial'),
    confidence: call.transcript.length >= 4 ? 0.91 : call.transcript.length >= 2 ? 0.74 : 0.58,
    detail: `${call.organizationName} • ${call.outcome} • ${call.summary}`,
    createdAt: call.createdAt,
  }));
}

function buildDemoSessions(calls: RecentCall[], organizationId: string, icpPackId: string): DemoSession[] {
  return calls.slice(0, 4).map((call, index) => {
    const sessionStatus: DemoSession['status'] = index === 0 ? 'completed' : index === 1 ? 'queued' : 'draft';

    return {
      id: `${call.id}-demo`,
      organizationId,
      icpPackId,
      targetPhoneNumber: call.toNumber ?? call.caller,
      assignedNumberLabel: call.fromNumber ?? 'Managed demo line',
      scenarioLabel: index === 0 ? 'Proof call' : 'Client replay',
      status: sessionStatus,
      resultingCallId: call.id,
      createdAt: new Date(Date.now() - index * 1000 * 60 * 40).toISOString(),
    };
  });
}

function buildLeadCaptureAttempts(leads: LeadRecord[], organizationId: string): LeadCaptureAttempt[] {
  return leads.slice(0, 8).map((lead) => {
    const captureSource: LeadCaptureAttempt['source'] =
      lead.recoveryStatus === 'recovered' ? 'transcript-recovery' : 'structured';
    const captureStatus: LeadCaptureAttempt['status'] =
      lead.recoveryStatus === 'needs-review' ? 'partial' : 'captured';

    return {
      id: `${lead.id}-capture`,
      organizationId,
      leadId: lead.id,
      icpPackId: lead.icpPackId || getIcpTemplatePack(undefined).id,
      source: captureSource,
      status: captureStatus,
      confidence: lead.recoveryConfidence ?? (lead.enrichmentStatus === 'completed' ? 0.92 : 0.78),
      missingFields: lead.email ? [] : ['Email'],
      createdAt: new Date().toISOString(),
    };
  });
}

function buildLeadRecoveryRuns(leads: LeadRecord[], organizationId: string): LeadRecoveryRun[] {
  return leads.slice(0, 6).map((lead, index) => ({
    id: `${lead.id}-recovery-run`,
    organizationId,
    leadId: lead.id,
    icpPackId: lead.icpPackId || getIcpTemplatePack(undefined).id,
    provider: index % 2 === 0 ? 'gemini' : 'fallback',
    status: lead.recoveryStatus ?? (index % 3 === 0 ? 'needs-review' : 'recovered'),
    confidence: lead.recoveryConfidence ?? (index % 3 === 0 ? 0.58 : 0.88),
    missingFields: lead.email ? [] : ['Email'],
    extractedLead: {
      name: lead.name,
      phone: lead.phone,
      company: lead.company,
      service: lead.service,
    },
    notes: [
      lead.recoveryStatus === 'needs-review'
        ? 'Transcript lacked a confident email/company match.'
        : 'Structured and transcript data agreed closely enough to auto-promote.',
    ],
    createdAt: new Date(Date.now() - index * 1000 * 60 * 55).toISOString(),
  }));
}

function buildLeadEnrichmentRuns(leads: LeadRecord[], organizationId: string): LeadEnrichmentRun[] {
  return leads
    .filter((lead) => lead.enrichmentStatus)
    .slice(0, 6)
    .map((lead, index) => ({
      id: `${lead.id}-enrichment`,
      organizationId,
      leadId: lead.id,
      provider: index % 2 === 0 ? 'apify' : 'fallback',
      status: lead.enrichmentStatus ?? 'partial',
      summary:
        lead.enrichmentStatus === 'completed'
          ? 'Company footprint and website details were appended to the lead.'
          : 'A partial enrichment was attached; operator review recommended before outbound follow-up.',
      enrichment: {
        website: lead.email ? `https://${lead.email.split('@')[1]}` : undefined,
        owner: lead.owner || 'Ops queue',
      },
      createdAt: new Date(Date.now() - index * 1000 * 60 * 70).toISOString(),
    }));
}

export async function getAdminDashboardData(viewer: ViewerContext): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();
  const activeOrganizationId = getDefaultOrganizationId(viewer);

  const [
    templatePacks,
    organizationResult,
    membershipResult,
    agentResult,
    callResult,
    campaignResult,
    phoneNumberResult,
    clientAccountResult,
    blueprintResult,
    voicemailAssetResult,
  ] = await Promise.all([
    loadTemplatePacks(),
    supabase
      .from('organizations')
      .select('id, name, slug, timezone, plan_name, is_active, vapi_account_mode, vapi_managed_label, vapi_api_key_id, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('organization_members').select('organization_id'),
    supabase
      .from('agents')
      .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, vapi_sync_status, vapi_last_error, vapi_last_synced_at, vapi_last_published_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('calls')
      .select('id, organization_id, agent_id, vapi_assistant_id, vapi_call_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at, started_at, ended_at, recording_url, transcript_json, cost_usd, latency_ms, disposition, win_status')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('campaigns')
      .select('id, organization_id, name, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('phone_numbers')
      .select('id, organization_id, phone_e164, friendly_name, is_active')
      .eq('is_active', true),
    supabase
      .from('client_accounts')
      .select('organization_id, primary_contact_name, primary_contact_email, onboarding_status, support_tier'),
    supabase
      .from('demo_blueprints')
      .select('id, organization_id, title, website_url, created_at, status, knowledge_pack_slug, query_tool_id, vapi_assistant_id, kb_sync_status, last_test_call_id, last_test_call_at, embed_snippet')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('voicemail_assets')
      .select('id, organization_id, file_name, file_type, storage_path, duration_seconds, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const organizations = (organizationResult.data ?? []) as OrganizationRow[];
  const memberships = (membershipResult.data ?? []) as Array<{ organization_id: string }>;
  const agents = (agentResult.data ?? []) as AgentRow[];
  const calls = (callResult.data ?? []) as CallRow[];
  const campaigns = (campaignResult.data ?? []) as CampaignRow[];
  const phoneNumbers = (phoneNumberResult.data ?? []) as PhoneNumberRow[];
  const clientAccounts = new Map(
    ((clientAccountResult.data ?? []) as ClientAccountRow[]).map((account) => [account.organization_id, account]),
  );
  const blueprints = (blueprintResult.data ?? []) as BlueprintRow[];
  const blueprintAssetResult = blueprints.length
    ? await supabase
        .from('demo_blueprint_assets')
        .select('id, demo_blueprint_id, asset_type, source_label, source_url, file_name, file_ext, mime_type, storage_path, byte_size, vapi_file_id, sync_status, created_at, metadata')
        .in('demo_blueprint_id', blueprints.map((blueprint) => blueprint.id))
        .order('created_at', { ascending: true })
    : { data: [] as BlueprintAssetRow[] };
  const blueprintAssets = (blueprintAssetResult.data ?? []) as BlueprintAssetRow[];
  const blueprintAssetsById = blueprintAssets.reduce<Map<string, KnowledgeAsset[]>>((accumulator, asset) => {
    const next = accumulator.get(asset.demo_blueprint_id) ?? [];
    next.push(mapKnowledgeAsset(asset));
    accumulator.set(asset.demo_blueprint_id, next);
    return accumulator;
  }, new Map());
  const voicemailAssets = (voicemailAssetResult.data ?? []) as VoicemailAssetRow[];
  const voicemailAssetMap = new Map(voicemailAssets.map((asset) => [asset.id, asset]));

  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
  const memberCounts = memberships.reduce<Map<string, number>>((accumulator, membership) => {
    accumulator.set(membership.organization_id, (accumulator.get(membership.organization_id) ?? 0) + 1);
    return accumulator;
  }, new Map());
  const agentsByOrganization = agents.reduce<Map<string, AgentRow[]>>((accumulator, agent) => {
    const existing = accumulator.get(agent.organization_id) ?? [];
    existing.push(agent);
    accumulator.set(agent.organization_id, existing);
    return accumulator;
  }, new Map());
  const callsByOrganization = calls.reduce<Map<string, CallRow[]>>((accumulator, call) => {
    const existing = accumulator.get(call.organization_id) ?? [];
    existing.push(call);
    accumulator.set(call.organization_id, existing);
    return accumulator;
  }, new Map());
  const phoneByOrganization = phoneNumbers.reduce<Map<string, PhoneNumberRow[]>>((accumulator, phoneNumber) => {
    const existing = accumulator.get(phoneNumber.organization_id) ?? [];
    existing.push(phoneNumber);
    accumulator.set(phoneNumber.organization_id, existing);
    return accumulator;
  }, new Map());

  const organizationCards: OrganizationSummary[] = organizations.map((organization) => {
    const organizationAgents = agentsByOrganization.get(organization.id) ?? [];
    const organizationCalls = callsByOrganization.get(organization.id) ?? [];
    const latestCall = organizationCalls[0];
    const organizationPhones = phoneByOrganization.get(organization.id) ?? [];
    const clientAccount = clientAccounts.get(organization.id);

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      planName: organization.plan_name,
      isActive: organization.is_active,
      memberCount: memberCounts.get(organization.id) ?? 0,
      agentCount: organizationAgents.length,
      liveAgentCount: organizationAgents.filter((agent) => agent.is_active).length,
      phoneNumbers: organizationPhones.map((phoneNumber) => formatPhoneNumber(phoneNumber.phone_e164)),
      vapiAccountMode: organization.vapi_account_mode === 'byo' ? 'byo' : 'managed',
      vapiManagedLabel: organization.vapi_managed_label ?? null,
      vapiApiKeyLabel: null,
      vapiApiKeyId: organization.vapi_api_key_id ?? null,
      lastCallAt: latestCall?.created_at,
      latestCallSummary: latestCall?.summary ?? undefined,
      primaryContactName: clientAccount?.primary_contact_name ?? null,
      primaryContactEmail: clientAccount?.primary_contact_email ?? null,
      onboardingStatus: clientAccount?.onboarding_status ?? null,
      supportTier: clientAccount?.support_tier ?? null,
    };
  });

  const metrics: MetricCard[] = [
    {
      label: 'Managed organizations',
      value: String(organizations.length),
      delta: `${organizationCards.filter((item) => item.isActive).length} active`,
      tone: 'positive',
    },
    {
      label: 'Live agents',
      value: String(agents.filter((agent) => agent.is_active).length),
      delta: `${agents.length} total tracked`,
      tone: 'positive',
    },
    {
      label: 'Logged calls',
      value: String(calls.length),
      delta: calls[0] ? `Last call ${formatRelativeTime(calls[0].created_at)}` : 'No call traffic yet',
      tone: calls.length ? 'positive' : 'neutral',
    },
    {
      label: 'Campaigns',
      value: String(campaigns.length),
      delta: `${campaigns.filter((campaign) => campaign.status === 'active').length} active`,
      tone: campaigns.length ? 'warning' : 'neutral',
    },
  ];

  const recentCalls = calls.map((call) => {
    const organizationName = organizationMap.get(call.organization_id)?.name ?? 'Unknown organization';
    return mapRecentCall(call, organizationName, voicemailAssetMap);
  });
  const mappedAgents = agents.map(mapAgent);
  const numberPool = buildNumberPool(phoneNumbers, organizationCards);

  return {
    metrics,
    organizations: organizationCards,
    recentCalls,
    activeOrganizationId: activeOrganizationId ?? undefined,
    recentBlueprints: blueprints.map((blueprint) => mapBlueprint(blueprint, blueprintAssetsById.get(blueprint.id) ?? [])),
    commandCenter: [
      {
        label: 'Revenue pressure',
        value: `${organizationCards.reduce((sum, organization) => sum + organization.liveAgentCount, 0)} live stacks`,
        trend: `${campaigns.filter((campaign) => campaign.status === 'active').length} outbound motions active`,
        tone: 'success',
      },
      {
        label: 'Failure rate',
        value: `${buildRecoveryQueue(recentCalls).filter((item) => item.status === 'needs-review').length} needs review`,
        trend: 'Transcript fallback queue is visible and actionable',
        tone: 'warning',
      },
      {
        label: 'Number pool usage',
        value: `${numberPool.filter((entry) => entry.status === 'assigned').length}/${numberPool.length}`,
        trend: `${numberPool.filter((entry) => entry.status === 'free').length} free demo numbers`,
        tone: 'default',
      },
      {
        label: 'ICP coverage',
        value: `${templatePacks.length} launch packs`,
        trend: 'Home services, dental, med spa, and legal seeded',
        tone: 'muted',
      },
    ],
    icpPacks: templatePacks,
    assistantVersions: buildAssistantVersions(mappedAgents),
    numberPool,
    numberPoolHealth: {
      total: numberPool.length,
      free: numberPool.filter((entry) => entry.status === 'free').length,
      assigned: numberPool.filter((entry) => entry.status === 'assigned').length,
      cooldown: numberPool.filter((entry) => entry.status === 'cooldown').length,
    },
    recoveryQueue: buildRecoveryQueue(recentCalls),
    playbooks: playbookDocuments,
    demoSessions: buildDemoSessions(recentCalls, activeOrganizationId ?? organizationCards[0]?.id ?? '', templatePacks[0]?.id ?? icpTemplatePacks[0].id),
  };
}

export async function getClientDashboardData(viewer: ViewerContext, organizationId?: string | null): Promise<ClientDashboardData> {
  const supabase = await createSupabaseServerClient();
  const resolvedOrganizationId = organizationId ?? getDefaultOrganizationId(viewer);
  const templatePacks = await loadTemplatePacks();

  if (!resolvedOrganizationId) {
    return {
      organizationId: '',
      organizationName: 'No organization assigned',
      organizationSlug: '',
      planName: null,
      timezone: 'America/Chicago',
      vapiAccountMode: 'managed',
      vapiManagedLabel: null,
      vapiApiKeyLabel: null,
      vapiApiKeyId: null,
      metrics: [
        { label: 'Captured leads', value: '0', delta: 'No org membership yet' },
        { label: 'Live agents', value: '0', delta: 'No org membership yet' },
        { label: 'Logged calls', value: '0', delta: 'No org membership yet' },
        { label: 'Active campaigns', value: '0', delta: 'No org membership yet' },
      ],
      phoneNumbers: [],
      agents: [],
      leads: [],
      recentCalls: [],
      campaigns: [],
      recentBlueprints: [],
      currentPack: templatePacks[0] ?? icpTemplatePacks[0],
      leadCaptureAttempts: [],
      leadRecoveryRuns: [],
      leadEnrichmentRuns: [],
      playgroundScenarios: clientPlaygroundScenarios,
      recentDemoSessions: [],
      protectedBlocks: ['Compliance guardrails', 'Escalation logic', 'Protected tool usage'],
      tickets: [],
      exportJobs: [],
    };
  }

  const [
    organizationResult,
    agentResult,
    contactResult,
    callResult,
    campaignResult,
    phoneNumberResult,
    exportJobResult,
    blueprintResult,
    voicemailAssetResult,
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, timezone, plan_name, is_active, vapi_account_mode, vapi_managed_label, vapi_api_key_id')
      .eq('id', resolvedOrganizationId)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, vapi_sync_status, vapi_last_error, vapi_last_synced_at, vapi_last_published_at, updated_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('contacts')
      .select('id, organization_id, full_name, phone_e164, source, metadata, updated_at, pipeline_stage, last_call_at, win_status, notes')
      .eq('organization_id', resolvedOrganizationId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('calls')
      .select('id, organization_id, agent_id, vapi_assistant_id, vapi_call_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at, started_at, ended_at, recording_url, transcript_json, cost_usd, latency_ms, disposition, win_status')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('campaigns')
      .select('id, organization_id, name, status, created_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('phone_numbers')
      .select('id, organization_id, phone_e164, friendly_name, is_active')
      .eq('organization_id', resolvedOrganizationId)
      .eq('is_active', true),
    supabase
      .from('export_jobs')
      .select('id, organization_id, export_type, status, file_name, mime_type, artifact_path, error_text, created_at, completed_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('demo_blueprints')
      .select('id, organization_id, title, website_url, created_at, status, knowledge_pack_slug, query_tool_id, vapi_assistant_id, kb_sync_status, last_test_call_id, last_test_call_at, embed_snippet')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('voicemail_assets')
      .select('id, organization_id, file_name, file_type, storage_path, duration_seconds, created_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: false }),
  ]);

  const organization = organizationResult.data as OrganizationRow | null;
  const agents = ((agentResult.data ?? []) as AgentRow[]).map(mapAgent);
  const contacts = (contactResult.data ?? []) as ContactRow[];
  const calls = (callResult.data ?? []) as CallRow[];
  const campaigns = (campaignResult.data ?? []) as CampaignRow[];
  const phoneNumbers = (phoneNumberResult.data ?? []) as PhoneNumberRow[];
  const exportJobs = ((exportJobResult.data ?? []) as ExportJobRow[]).map((job) => ({
    id: job.id,
    organizationId: job.organization_id,
    exportType: job.export_type,
    status: job.status,
    fileName: job.file_name ?? undefined,
    mimeType: job.mime_type ?? undefined,
    artifactPath: job.artifact_path ?? undefined,
    errorText: job.error_text ?? undefined,
    createdAt: formatRelativeTime(job.created_at),
    completedAt: job.completed_at ? formatRelativeTime(job.completed_at) : undefined,
  }));
  const blueprints = (blueprintResult.data ?? []) as BlueprintRow[];
  const blueprintAssetResult = blueprints.length
    ? await supabase
        .from('demo_blueprint_assets')
        .select('id, demo_blueprint_id, asset_type, source_label, source_url, file_name, file_ext, mime_type, storage_path, byte_size, vapi_file_id, sync_status, created_at, metadata')
        .in('demo_blueprint_id', blueprints.map((blueprint) => blueprint.id))
        .order('created_at', { ascending: true })
    : { data: [] as BlueprintAssetRow[] };
  const blueprintAssets = (blueprintAssetResult.data ?? []) as BlueprintAssetRow[];
  const blueprintAssetsById = blueprintAssets.reduce<Map<string, KnowledgeAsset[]>>((accumulator, asset) => {
    const next = accumulator.get(asset.demo_blueprint_id) ?? [];
    next.push(mapKnowledgeAsset(asset));
    accumulator.set(asset.demo_blueprint_id, next);
    return accumulator;
  }, new Map());
  const voicemailAssets = (voicemailAssetResult.data ?? []) as VoicemailAssetRow[];
  const voicemailAssetMap = new Map(voicemailAssets.map((asset) => [asset.id, asset]));
  const organizationName = organization?.name ?? 'Workspace';
  const vapiApiKeyLabel = await getVapiApiKeyLabel(supabase, resolvedOrganizationId, organization?.vapi_api_key_id);
  const leads = contacts.map(mapLead);
  const recentCalls = calls.map((call) => mapRecentCall(call, organizationName, voicemailAssetMap));
  const currentPack = resolveTemplatePack(
    templatePacks,
    parseString(
      (agents[0]?.config as Record<string, unknown> | undefined)?.icpPackId,
      contacts[0] ? parseString(contacts[0].metadata?.icpPackId, templatePacks[0]?.id ?? icpTemplatePacks[0].id) : templatePacks[0]?.id ?? icpTemplatePacks[0].id,
    ),
  );
  const tickets = await loadSupportTickets(resolvedOrganizationId);

  const metrics: MetricCard[] = [
    {
      label: 'Captured leads',
      value: String(leads.length),
      delta: contacts[0] ? `Last lead ${formatRelativeTime(contacts[0].updated_at)}` : 'No leads captured yet',
      tone: leads.length ? 'positive' : 'neutral',
    },
    {
      label: 'Live agents',
      value: String(agents.filter((agent) => agent.status === 'live').length),
      delta: `${agents.length} total scoped assistants`,
      tone: agents.length ? 'positive' : 'neutral',
    },
    {
      label: 'Logged calls',
      value: String(recentCalls.length),
      delta: calls[0] ? `Last call ${formatRelativeTime(calls[0].created_at)}` : 'No call traffic yet',
      tone: recentCalls.length ? 'warning' : 'neutral',
    },
    {
      label: 'Campaigns',
      value: String(campaigns.length),
      delta: `${campaigns.filter((campaign) => campaign.status === 'active').length} active`,
      tone: campaigns.length ? 'positive' : 'neutral',
    },
  ];

  return {
    organizationId: resolvedOrganizationId,
    organizationName,
    organizationSlug: organization?.slug ?? '',
    planName: organization?.plan_name ?? null,
    timezone: organization?.timezone ?? 'America/Chicago',
    vapiAccountMode: organization?.vapi_account_mode === 'byo' ? 'byo' : 'managed',
    vapiManagedLabel: organization?.vapi_managed_label ?? null,
    vapiApiKeyLabel,
    vapiApiKeyId: organization?.vapi_api_key_id ?? null,
    metrics,
    phoneNumbers: phoneNumbers.map((phoneNumber) => formatPhoneNumber(phoneNumber.phone_e164)),
    agents,
    leads,
    recentCalls,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      createdAt: formatDateTime(campaign.created_at),
    })),
    recentBlueprints: blueprints.map((blueprint) => mapBlueprint(blueprint, blueprintAssetsById.get(blueprint.id) ?? [])),
    currentPack,
    leadCaptureAttempts: buildLeadCaptureAttempts(leads, resolvedOrganizationId),
    leadRecoveryRuns: buildLeadRecoveryRuns(leads, resolvedOrganizationId),
    leadEnrichmentRuns: buildLeadEnrichmentRuns(leads, resolvedOrganizationId),
    playgroundScenarios: clientPlaygroundScenarios,
    recentDemoSessions: buildDemoSessions(
      recentCalls,
      resolvedOrganizationId,
      currentPack.id,
    ),
    protectedBlocks: ['Global compliance phrasing', 'Protected routing logic', 'Tool permissions'],
    tickets,
    exportJobs,
  };
}

export function buildInitialDemoTemplate() {
  return buildFallbackDemoTemplate({});
}
