import { appConfig } from '@/lib/app-config';
import type { DemoTemplateInput, DemoTemplateResult } from '@/lib/types';
import { buildNaturalFirstMessage, buildNaturalSystemPrompt, naturalDemoVoicePreset } from '@/lib/voice-assistant-template';

type VerticalProfile = {
  vertical: string;
  targetCaller: string;
  summary: string;
  qualificationChecklist: string[];
  faqSnippets: string[];
  objectionHandling: string[];
};

const verticalProfiles: Array<{ keywords: string[]; profile: VerticalProfile }> = [
  {
    keywords: ['dentist', 'dental', 'orthodont', 'periodont', 'implant'],
    profile: {
      vertical: 'Dental',
      targetCaller: 'new patient or existing patient trying to book, reschedule, or ask about insurance',
      summary: 'Handle treatment questions quickly, qualify urgency, and move callers into booked appointments or callback tasks.',
      qualificationChecklist: ['Reason for visit', 'New or existing patient', 'Insurance status', 'Preferred time window'],
      faqSnippets: ['Accepted insurance carriers', 'Office hours and emergency availability', 'Typical wait time for cleanings and urgent visits'],
      objectionHandling: ['Acknowledge anxiety and explain what happens next', 'Offer the fastest available appointment window', 'Reassure the caller that a human can follow up if needed'],
    },
  },
  {
    keywords: ['hvac', 'heating', 'cooling', 'air condition', 'furnace'],
    profile: {
      vertical: 'HVAC',
      targetCaller: 'homeowner or property manager with an install, repair, or emergency service need',
      summary: 'Prioritize emergency jobs, collect equipment symptoms, and route warm leads into booked service windows.',
      qualificationChecklist: ['Issue type', 'System age or brand if known', 'Is the system fully down', 'Property zip code'],
      faqSnippets: ['Emergency response window', 'Financing availability', 'Diagnostic fee policy'],
      objectionHandling: ['Frame urgency without sounding alarmist', 'Offer same-day callback if dispatch is required', 'Explain diagnostic process clearly'],
    },
  },
  {
    keywords: ['med spa', 'medspa', 'botox', 'filler', 'aesthetic'],
    profile: {
      vertical: 'Med Spa',
      targetCaller: 'prospect comparing treatments, pricing, or consultation availability',
      summary: 'Create a luxury first impression, qualify aesthetic goals, and book consultations with strong follow-up data.',
      qualificationChecklist: ['Desired treatment', 'First-time or returning guest', 'Timeline for treatment', 'Comfort with consultation-first booking'],
      faqSnippets: ['Most popular treatments', 'Consultation expectations', 'Membership or package options'],
      objectionHandling: ['Address pricing carefully and push toward consultation value', 'Highlight clinician expertise and safety', 'Offer soft next steps if they are still deciding'],
    },
  },
  {
    keywords: ['law', 'attorney', 'legal', 'injury', 'estate planning'],
    profile: {
      vertical: 'Legal',
      targetCaller: 'prospective client seeking a consultation and unsure if the firm is the right fit',
      summary: 'Screen cases, collect conflict-check basics, and set clear expectations before handing off to the legal team.',
      qualificationChecklist: ['Matter type', 'Location or jurisdiction', 'Urgency of legal issue', 'Preferred callback number'],
      faqSnippets: ['Consultation format', 'Practice areas served', 'When an attorney follows up'],
      objectionHandling: ['Avoid legal advice on intake calls', 'Acknowledge urgency while keeping scope narrow', 'Offer fast escalation to staff when a matter is time-sensitive'],
    },
  },
];

function normalizeBusinessName(input: DemoTemplateInput) {
  if (input.businessName?.trim()) {
    return input.businessName.trim();
  }

  if (input.googleBusinessProfile?.trim()) {
    const firstLine = input.googleBusinessProfile.split('\n').find((line) => line.trim());
    if (firstLine) {
      return firstLine.replace(/[-|].*$/, '').trim();
    }
  }

  if (input.websiteUrl?.trim()) {
    try {
      const hostname = new URL(input.websiteUrl).hostname.replace(/^www\./, '');
      const [first] = hostname.split('.');
      return first
        .split(/[-_]/)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
    } catch {
      return input.websiteUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  }

  return 'Demo Business';
}

function detectVertical(source: string): VerticalProfile {
  const haystack = source.toLowerCase();

  for (const entry of verticalProfiles) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.profile;
    }
  }

  return {
    vertical: 'Service Business',
    targetCaller: 'lead who wants a fast answer, a booked appointment, or a callback from the team',
    summary: 'Keep the conversation grounded, collect lead data fast, and either book the next step or trigger a human follow-up.',
    qualificationChecklist: ['Primary need', 'Location', 'Best callback number', 'Preferred next step'],
    faqSnippets: ['Hours and service coverage', 'What happens after the call', 'How quickly the team follows up'],
    objectionHandling: ['Keep answers brief and practical', 'Offer to text or callback when information is incomplete', 'Escalate to a human when stakes rise'],
  };
}

function buildMermaidFlowchart(businessName: string) {
  return [
    'flowchart LR',
    `A["Inbound demo call for ${businessName}"] --> B["Assistant opens with a natural greeting"]`,
    'B --> C{"Is the caller ready to book or qualify?"}',
    'C -->|Yes| D["Capture lead details and service intent"]',
    'C -->|No| E["Handle FAQ or objection"]',
    'E --> F["Offer callback, text follow-up, or transfer"]',
    'D --> G["Write lead + transcript to client dashboard"]',
    'F --> G',
    'G --> H["Surface recording, summary, and next action"]',
  ].join('\n');
}

export function buildFallbackDemoTemplate(input: DemoTemplateInput, diagnostics: string[] = []): DemoTemplateResult {
  const businessName = normalizeBusinessName(input);
  const sourceText = [input.websiteUrl, input.googleBusinessProfile, input.notes, input.goal].filter(Boolean).join('\n');
  const profile = detectVertical(sourceText);
  const orchestrationMode = input.orchestrationMode ?? 'multi';

  const systemPrompt = buildNaturalSystemPrompt({
    businessName,
    role: 'inbound',
    vertical: profile.vertical,
    summary: profile.summary,
    targetCaller: profile.targetCaller,
    orchestrationMode,
    qualificationChecklist: profile.qualificationChecklist,
    faqSnippets: profile.faqSnippets,
    objectionHandling: profile.objectionHandling,
  });

  return {
    mode: 'fallback',
    diagnostics,
    orchestrationMode,
    businessContext: {
      businessName,
      vertical: profile.vertical,
      targetCaller: profile.targetCaller,
      summary: profile.summary,
    },
    assistantDraft: {
      name: `${businessName} Demo Concierge`,
      firstMessage: buildNaturalFirstMessage({
        businessName,
        role: 'inbound',
        vertical: profile.vertical,
      }),
      systemPrompt,
      leadCaptureFields: profile.qualificationChecklist,
      qualificationChecklist: profile.qualificationChecklist,
      faqSnippets: profile.faqSnippets,
      objectionHandling: profile.objectionHandling,
      successCriteria: [
        'The assistant opens naturally and sounds like a real front desk, not a toy demo.',
        'The assistant answers direct questions before it shifts back to intake.',
        'The assistant captures enough detail to route the lead confidently.',
        'The call ends with a booked next step, a callback task, or a clean qualification outcome.',
      ],
    },
    recommendedStack: {
      model: {
        provider: appConfig.vapi.defaults.modelProvider,
        name: appConfig.vapi.defaults.modelName,
        reason: 'Configured as the default fast-path model for live voice demos and low-latency qualification.',
      },
      voice: {
        provider: naturalDemoVoicePreset.provider,
        voiceId: naturalDemoVoicePreset.voiceId,
        label: 'Primary demo voice',
        reason: 'Tuned for a more natural front-desk feel while keeping response latency low.',
        fallbackVoices: [...naturalDemoVoicePreset.fallbackVoices],
      },
      telephony: {
        phoneNumberId: appConfig.vapi.demoPhoneNumberId,
        label: appConfig.vapi.demoNumberLabel,
        outboundReady: Boolean(appConfig.vapi.demoPhoneNumberId),
      },
    },
    mermaidFlowchart: buildMermaidFlowchart(businessName),
  };
}

export function buildVapiAssistantPayload(
  template: DemoTemplateResult,
  options: {
    metadata?: Record<string, unknown>;
  } = {},
) {
  return {
    name: template.assistantDraft.name,
    firstMessage: template.assistantDraft.firstMessage,
    model: {
      provider: template.recommendedStack.model.provider,
      model: template.recommendedStack.model.name,
      messages: [
        {
          role: 'system' as const,
          content: template.assistantDraft.systemPrompt,
        },
      ],
    },
    voice: {
      provider: template.recommendedStack.voice.provider,
      voiceId: template.recommendedStack.voice.voiceId,
      fallbackPlan: {
        voices: template.recommendedStack.voice.fallbackVoices,
      },
    },
    metadata: options.metadata,
  };
}
