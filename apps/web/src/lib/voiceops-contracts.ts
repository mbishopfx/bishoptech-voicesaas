export type LeadFieldKind = 'text' | 'phone' | 'email' | 'choice' | 'multiline' | 'boolean';

export type LeadFieldSchema = {
  key: string;
  label: string;
  description: string;
  kind: LeadFieldKind;
  required: boolean;
  choices?: string[];
};

export type ICPTemplatePack = {
  id: string;
  slug: string;
  label: string;
  vertical: 'home-services' | 'dental' | 'med-spa' | 'legal';
  summary: string;
  positioning: string;
  leadSchema: {
    requiredFields: LeadFieldSchema[];
    optionalFields: LeadFieldSchema[];
  };
  gradingRubric: Array<{
    id: string;
    label: string;
    weight: number;
    successDefinition: string;
  }>;
  voicePreset: {
    provider: string;
    voiceId: string;
    style: string;
  };
  toolPreset: {
    knowledgeMode: 'faq-first' | 'qualification-first' | 'handoff-first';
    approvedToggles: string[];
    protectedToggles: string[];
  };
  testScenarios: Array<{
    id: string;
    label: string;
    prompt: string;
    expectedOutcome: string;
  }>;
  docs: {
    operatorGuide: string;
    revisionGuide: string;
    recoveryGuide: string;
  };
};

export type AssistantVersion = {
  id: string;
  agentId: string;
  organizationId: string;
  icpPackId: string;
  versionLabel: string;
  status: 'draft' | 'published' | 'archived';
  summary: string;
  changedAt: string;
  changedBy: string;
};

export type DemoSession = {
  id: string;
  organizationId: string;
  assistantId?: string;
  assistantVersionId?: string;
  icpPackId: string;
  targetPhoneNumber: string;
  assignedNumberLabel: string;
  scenarioLabel: string;
  status: 'draft' | 'queued' | 'completed' | 'failed';
  resultingCallId?: string;
  createdAt: string;
};

export type ManagedNumberReservation = {
  id: string;
  organizationId?: string;
  phoneNumber: string;
  label: string;
  status: 'free' | 'reserved' | 'assigned' | 'cooldown';
  assignedTo?: string;
  reservationEndsAt?: string;
  lastUsedAt?: string;
};

export type LeadCaptureAttempt = {
  id: string;
  organizationId: string;
  callId?: string;
  icpPackId?: string;
  source: 'structured' | 'transcript-recovery' | 'manual-review';
  status: 'captured' | 'partial' | 'failed';
  confidence: number;
  missingFields: string[];
  createdAt: string;
};

export type LeadRecoveryRun = {
  id: string;
  organizationId?: string;
  callId?: string;
  leadId?: string;
  icpPackId?: string;
  provider: 'gemini' | 'fallback';
  status: 'recovered' | 'partial' | 'needs-review' | 'failed';
  confidence: number;
  missingFields: string[];
  extractedLead: Record<string, unknown>;
  notes: string[];
  createdAt: string;
};

export type LeadEnrichmentRun = {
  id: string;
  organizationId?: string;
  leadId: string;
  provider: 'apify' | 'fallback';
  status: 'completed' | 'partial' | 'failed';
  summary: string;
  enrichment: Record<string, unknown>;
  createdAt: string;
};

export type CallQaGrade = {
  id: string;
  callId: string;
  icpPackId?: string;
  overallScore: number;
  scoreLabel: 'excellent' | 'strong' | 'watch' | 'weak';
  rubricScores: Array<{
    label: string;
    score: number;
  }>;
  notes: string[];
  createdAt: string;
};

export type ClientPlaygroundScenario = {
  id: string;
  icpPackId: string;
  label: string;
  description: string;
  defaultPrompt: string;
  expectedSignals: string[];
};

export type PlaybookDocument = {
  id: string;
  label: string;
  summary: string;
  href: string;
  audience: 'operator' | 'client' | 'both';
};

export type NumberPoolHealth = {
  total: number;
  free: number;
  assigned: number;
  cooldown: number;
};
