import type { AssistantConfigSnapshot } from '@/lib/assistant-config';
import type {
  AssistantVersion,
  CallQaGrade,
  ClientPlaygroundScenario,
  DemoSession,
  ICPTemplatePack,
  LeadCaptureAttempt,
  LeadEnrichmentRun,
  LeadRecoveryRun,
  ManagedNumberReservation,
  NumberPoolHealth,
  PlaybookDocument,
} from '@/lib/voiceops-contracts';

export type MetricTone = 'neutral' | 'positive' | 'warning';
export type AgentRole = 'inbound' | 'outbound' | 'campaign' | 'specialist';
export type OrchestrationMode = 'inbound' | 'outbound' | 'multi';
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';

export type IntegrationAvailability = {
  label: string;
  ready: boolean;
  detail: string;
};

export type MetricCard = {
  label: string;
  value: string;
  delta: string;
  tone?: MetricTone;
};

export type ViewerMembership = {
  organizationId: string;
  role: OrganizationRole;
  organizationName: string;
  organizationSlug: string;
  timezone: string;
  planName: string | null;
  isActive: boolean;
};

export type ViewerContext = {
  id: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
  defaultOrganizationId: string | null;
  memberships: ViewerMembership[];
};

export type DashboardAgent = {
  id: string;
  organizationId: string;
  name: string;
  role: AgentRole;
  vapiAssistantId?: string;
  voice: string;
  model: string;
  status: 'ready' | 'pending' | 'live';
  purpose: string;
  lastSyncedAt: string;
  syncStatus?: 'synced' | 'draft' | 'dirty' | 'error' | 'unknown';
  lastError?: string | null;
  accountMode?: 'managed' | 'byo';
  config?: AssistantConfigSnapshot | Record<string, unknown>;
  draftPayload?: Record<string, unknown>;
  livePayload?: Record<string, unknown>;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  planName: string | null;
  isActive: boolean;
  memberCount: number;
  agentCount: number;
  liveAgentCount: number;
  phoneNumbers: string[];
  vapiAccountMode?: 'managed' | 'byo';
  vapiManagedLabel?: string | null;
  vapiApiKeyLabel?: string | null;
  vapiApiKeyId?: string | null;
  lastCallAt?: string;
  latestCallSummary?: string;
};

export type RecentCall = {
  id: string;
  caller: string;
  organizationName: string;
  summary: string;
  duration: string;
  outcome: string;
  direction: 'inbound' | 'outbound';
  recordingUrl?: string;
  recordingLabel?: string;
  createdAt: string;
  fromNumber?: string;
  toNumber?: string;
  startedAt?: string;
  assistantName?: string;
  modelName?: string;
  latencyLabel?: string;
  costLabel?: string;
  transcript: Array<{
    id: string;
    speaker: 'assistant' | 'caller' | 'system';
    label: string;
    text: string;
    timestamp?: string;
  }>;
  logItems: Array<{
    label: string;
    value: string;
  }>;
  tags: string[];
  exportText: string;
  leadRecoveryStatus?: LeadRecoveryRun['status'];
  qaGrade?: CallQaGrade['scoreLabel'];
};

export type LeadRecord = {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  service: string;
  urgency: string;
  source: string;
  transcriptExcerpt: string;
  audioUrl?: string;
  createdAt: string;
  recoveryStatus?: LeadRecoveryRun['status'];
  recoveryConfidence?: number;
  enrichmentStatus?: LeadEnrichmentRun['status'];
  owner?: string;
  nextAction?: string;
  icpPackId?: string;
};

export type DemoBlueprintSummary = {
  id: string;
  title: string;
  organizationId: string;
  createdAt: string;
  websiteUrl?: string;
};

export type DemoTemplateInput = {
  organizationId?: string;
  businessName?: string;
  websiteUrl?: string;
  googleBusinessProfile?: string;
  goal?: string;
  targetPhoneNumber?: string;
  notes?: string;
  orchestrationMode?: OrchestrationMode;
};

export type DemoTemplateResult = {
  mode: 'live' | 'fallback';
  diagnostics: string[];
  orchestrationMode: OrchestrationMode;
  businessContext: {
    businessName: string;
    vertical: string;
    targetCaller: string;
    summary: string;
  };
  assistantDraft: {
    name: string;
    firstMessage: string;
    systemPrompt: string;
    leadCaptureFields: string[];
    qualificationChecklist: string[];
    faqSnippets: string[];
    objectionHandling: string[];
    successCriteria: string[];
  };
  recommendedStack: {
    model: {
      provider: string;
      name: string;
      reason: string;
    };
    voice: {
      provider: string;
      voiceId: string;
      label: string;
      reason: string;
      fallbackVoices: Array<{
        provider: string;
        voiceId: string;
      }>;
    };
    telephony: {
      phoneNumberId?: string;
      label: string;
      outboundReady: boolean;
    };
  };
  mermaidFlowchart: string;
  persistedBlueprintId?: string;
};

export type DemoCallRequest = {
  organizationId?: string;
  targetPhoneNumber: string;
  assistantId?: string;
  template?: DemoTemplateResult;
};

export type DemoCallResult = {
  mode: 'live' | 'mock';
  message: string;
  assistantId: string;
  callId: string;
  phoneNumberId?: string;
  warnings: string[];
};

export type OnboardingRequest = {
  businessName: string;
  vertical: string;
  contactName?: string;
  contactEmail: string;
  password: string;
  contactPhone?: string;
  timezone?: string;
  websiteUrl?: string;
  googleBusinessProfile?: string;
  orchestrationMode: OrchestrationMode;
  vapiAccountMode: 'managed' | 'byo';
  vapiApiKey?: string;
};

export type OnboardingResult = {
  mode: 'live' | 'mock';
  organizationId: string;
  authUserId: string;
  email: string;
  organizationSlug: string;
  orchestrationMode: OrchestrationMode;
  vapiAccountMode: 'managed' | 'byo';
  vapiCredentialMode: 'managed' | 'byo' | 'none';
  agents: DashboardAgent[];
  warnings: string[];
};

export type BlastRecipient = {
  rowNumber: number;
  name?: string;
  phoneNumber: string;
};

export type BlastCsvPreview = {
  validRecipients: BlastRecipient[];
  rejectedRows: Array<{
    rowNumber: number;
    raw: string[];
    reason: string;
  }>;
};

export type BlastCampaignRequest = {
  organizationId?: string;
  campaignName: string;
  csvText: string;
  script: string;
  assistantId: string;
  phoneNumberId?: string;
  voiceLabel?: string;
};

export type BlastCampaignResult = {
  mode: 'live' | 'mock' | 'queued';
  campaignId: string;
  assistantId?: string;
  campaignName: string;
  recipientsAccepted: number;
  recipientsRejected: number;
  warnings: string[];
};

export type OpsSnapshotCard = {
  label: string;
  value: string;
  trend: string;
  tone?: 'default' | 'success' | 'warning' | 'muted';
};

export type RecoveryQueueItem = {
  id: string;
  title: string;
  status: LeadRecoveryRun['status'];
  confidence: number;
  detail: string;
  createdAt: string;
};

export type AdminDashboardData = {
  metrics: MetricCard[];
  organizations: OrganizationSummary[];
  recentCalls: RecentCall[];
  activeOrganizationId?: string;
  recentBlueprints: DemoBlueprintSummary[];
  commandCenter: OpsSnapshotCard[];
  icpPacks: ICPTemplatePack[];
  assistantVersions: AssistantVersion[];
  numberPool: ManagedNumberReservation[];
  numberPoolHealth: NumberPoolHealth;
  recoveryQueue: RecoveryQueueItem[];
  playbooks: PlaybookDocument[];
  demoSessions: DemoSession[];
};

export type ClientDashboardData = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  planName: string | null;
  timezone: string;
  vapiAccountMode: 'managed' | 'byo';
  vapiManagedLabel: string | null;
  vapiApiKeyLabel: string | null;
  vapiApiKeyId: string | null;
  metrics: MetricCard[];
  phoneNumbers: string[];
  agents: DashboardAgent[];
  leads: LeadRecord[];
  recentCalls: RecentCall[];
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  recentBlueprints: DemoBlueprintSummary[];
  currentPack: ICPTemplatePack;
  leadCaptureAttempts: LeadCaptureAttempt[];
  leadRecoveryRuns: LeadRecoveryRun[];
  leadEnrichmentRuns: LeadEnrichmentRun[];
  playgroundScenarios: ClientPlaygroundScenario[];
  recentDemoSessions: DemoSession[];
  protectedBlocks: string[];
};
