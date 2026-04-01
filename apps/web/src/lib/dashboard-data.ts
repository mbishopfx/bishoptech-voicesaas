import { buildFallbackDemoTemplate } from '@/lib/demo-template';
import { formatDateTime, formatDuration, formatPhoneNumber, formatRelativeTime } from '@/lib/format';
import { getDefaultOrganizationId } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AdminDashboardData,
  ClientDashboardData,
  DashboardAgent,
  DemoBlueprintSummary,
  LeadRecord,
  MetricCard,
  OrganizationSummary,
  RecentCall,
  ViewerContext,
  WorkflowBoard,
} from '@/lib/types';

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan_name: string | null;
  is_active: boolean;
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
  updated_at?: string;
};

type CallRow = {
  id: string;
  organization_id: string;
  direction: 'inbound' | 'outbound';
  call_status: string;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ContactRow = {
  id: string;
  organization_id: string;
  full_name: string | null;
  phone_e164: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
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
};

type WorkflowBoardRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  nodes: Array<Record<string, unknown>> | null;
  edges: Array<Record<string, unknown>> | null;
  updated_at: string;
};

function parseString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parseAgentRole(agentType: string): DashboardAgent['role'] {
  if (agentType === 'outbound') {
    return 'outbound';
  }

  if (agentType === 'specialist') {
    return 'specialist';
  }

  return 'inbound';
}

function buildAgentPurpose(agentType: string, config?: Record<string, unknown> | null) {
  const explicitPurpose = parseString(config?.purpose, '');

  if (explicitPurpose) {
    return explicitPurpose;
  }

  if (agentType === 'outbound') {
    return 'Outbound follow-up, blast campaigns, reminders, and reactivation.';
  }

  if (agentType === 'specialist') {
    return 'Specialist handoff for deeper objections, advanced questions, and high-intent calls.';
  }

  return 'Inbound call handling, lead capture, FAQs, and booking qualification.';
}

function mapAgent(row: AgentRow): DashboardAgent {
  const config = row.config ?? {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    role: parseAgentRole(row.agent_type),
    vapiAssistantId: row.vapi_assistant_id ?? undefined,
    voice: parseString(config.voiceLabel, parseString(config.voiceId, 'Primary voice')),
    model: parseString(config.modelName, 'Model not synced'),
    status: row.is_active ? 'live' : 'pending',
    purpose: buildAgentPurpose(row.agent_type, config),
    lastSyncedAt: formatRelativeTime(row.updated_at),
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
  const recording = extractRecording(row, voicemailAssetsById);

  return {
    id: row.id,
    caller: formatPhoneNumber(row.from_number ?? row.to_number),
    organizationName,
    summary: row.summary ?? 'Call captured. Summary still pending.',
    duration: formatDuration(row.duration_seconds),
    outcome: row.call_status.replace(/_/g, ' '),
    direction: row.direction,
    recordingUrl: recording.recordingUrl,
    recordingLabel: recording.recordingLabel,
    createdAt: formatRelativeTime(row.created_at),
  };
}

function mapLead(row: ContactRow): LeadRecord {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    name: row.full_name || formatPhoneNumber(row.phone_e164),
    service: parseString(metadata.service, parseString(metadata.intent, 'New inquiry')),
    urgency: parseString(metadata.urgency, 'Normal'),
    source: row.source ?? 'Voice assistant',
    transcriptExcerpt:
      parseString(metadata.lastSummary, parseString(metadata.notes, 'Contact added to the workspace.')) ||
      'Contact added to the workspace.',
    createdAt: formatDateTime(row.updated_at),
  };
}

function mapBlueprint(row: BlueprintRow): DemoBlueprintSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    websiteUrl: row.website_url ?? undefined,
    createdAt: formatRelativeTime(row.created_at),
  };
}

function mapWorkflowBoard(row: WorkflowBoardRow | null): WorkflowBoard | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description ?? 'Visual workflow map for the handoff, follow-up, and routing story.',
    nodes: (row.nodes ?? []) as WorkflowBoard['nodes'],
    edges: (row.edges ?? []) as WorkflowBoard['edges'],
    updatedAt: formatRelativeTime(row.updated_at),
  };
}

export function buildEmptyWorkflowBoard(organizationId?: string | null): WorkflowBoard {
  return {
    organizationId: organizationId ?? undefined,
    title: 'Workflow Canvas',
    description: 'Map the live routing, handoffs, and capture steps before you present the workflow.',
    nodes: [],
    edges: [],
  };
}

export async function getAdminDashboardData(viewer: ViewerContext): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();
  const activeOrganizationId = getDefaultOrganizationId(viewer);

  const [
    organizationResult,
    membershipResult,
    agentResult,
    callResult,
    campaignResult,
    phoneNumberResult,
    boardResult,
    blueprintResult,
    voicemailAssetResult,
  ] = await Promise.all([
    supabase.from('organizations').select('id, name, slug, timezone, plan_name, is_active, created_at').order('created_at', { ascending: true }),
    supabase.from('organization_members').select('organization_id'),
    supabase
      .from('agents')
      .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('calls')
      .select('id, organization_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at')
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
    activeOrganizationId
      ? supabase
          .from('workflow_boards')
          .select('id, organization_id, title, description, nodes, edges, updated_at')
          .eq('organization_id', activeOrganizationId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
    supabase
      .from('demo_blueprints')
      .select('id, organization_id, title, website_url, created_at')
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
  const blueprints = (blueprintResult.data ?? []) as BlueprintRow[];
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
      lastCallAt: latestCall?.created_at,
      latestCallSummary: latestCall?.summary ?? undefined,
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

  return {
    metrics,
    organizations: organizationCards,
    recentCalls,
    activeOrganizationId: activeOrganizationId ?? undefined,
    latestWorkflowBoard: mapWorkflowBoard((boardResult as { data: WorkflowBoardRow | null }).data) ?? buildEmptyWorkflowBoard(activeOrganizationId),
    recentBlueprints: blueprints.map(mapBlueprint),
  };
}

export async function getClientDashboardData(viewer: ViewerContext, organizationId?: string | null): Promise<ClientDashboardData> {
  const supabase = await createSupabaseServerClient();
  const resolvedOrganizationId = organizationId ?? getDefaultOrganizationId(viewer);

  if (!resolvedOrganizationId) {
    return {
      organizationId: '',
      organizationName: 'No organization assigned',
      planName: null,
      timezone: 'America/Chicago',
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
      latestWorkflowBoard: buildEmptyWorkflowBoard(),
      recentBlueprints: [],
    };
  }

  const [
    organizationResult,
    agentResult,
    contactResult,
    callResult,
    campaignResult,
    phoneNumberResult,
    boardResult,
    blueprintResult,
    voicemailAssetResult,
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, timezone, plan_name, is_active')
      .eq('id', resolvedOrganizationId)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id, organization_id, name, agent_type, vapi_assistant_id, is_active, config, updated_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('contacts')
      .select('id, organization_id, full_name, phone_e164, source, metadata, updated_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('calls')
      .select('id, organization_id, direction, call_status, from_number, to_number, duration_seconds, summary, metadata, created_at')
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
      .from('workflow_boards')
      .select('id, organization_id, title, description, nodes, edges, updated_at')
      .eq('organization_id', resolvedOrganizationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('demo_blueprints')
      .select('id, organization_id, title, website_url, created_at')
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
  const blueprints = (blueprintResult.data ?? []) as BlueprintRow[];
  const voicemailAssets = (voicemailAssetResult.data ?? []) as VoicemailAssetRow[];
  const voicemailAssetMap = new Map(voicemailAssets.map((asset) => [asset.id, asset]));
  const organizationName = organization?.name ?? 'Workspace';

  const metrics: MetricCard[] = [
    {
      label: 'Captured leads',
      value: String(contacts.length),
      delta: contacts[0] ? `Last lead ${formatRelativeTime(contacts[0].updated_at)}` : 'No leads captured yet',
      tone: contacts.length ? 'positive' : 'neutral',
    },
    {
      label: 'Live agents',
      value: String(agents.filter((agent) => agent.status === 'live').length),
      delta: `${agents.length} total scoped assistants`,
      tone: agents.length ? 'positive' : 'neutral',
    },
    {
      label: 'Logged calls',
      value: String(calls.length),
      delta: calls[0] ? `Last call ${formatRelativeTime(calls[0].created_at)}` : 'No call traffic yet',
      tone: calls.length ? 'warning' : 'neutral',
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
    planName: organization?.plan_name ?? null,
    timezone: organization?.timezone ?? 'America/Chicago',
    metrics,
    phoneNumbers: phoneNumbers.map((phoneNumber) => formatPhoneNumber(phoneNumber.phone_e164)),
    agents,
    leads: contacts.map(mapLead),
    recentCalls: calls.map((call) => mapRecentCall(call, organizationName, voicemailAssetMap)),
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      createdAt: formatDateTime(campaign.created_at),
    })),
    latestWorkflowBoard: mapWorkflowBoard((boardResult.data as WorkflowBoardRow | null) ?? null) ?? buildEmptyWorkflowBoard(resolvedOrganizationId),
    recentBlueprints: blueprints.map(mapBlueprint),
  };
}

export function buildInitialDemoTemplate() {
  return buildFallbackDemoTemplate({});
}
