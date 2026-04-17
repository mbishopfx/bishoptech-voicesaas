import type { ClientPlaygroundScenario, ICPTemplatePack, PlaybookDocument } from '@/lib/voiceops-contracts';

export const icpTemplatePacks: ICPTemplatePack[] = [
  {
    id: 'icp-home-services',
    slug: 'home-services',
    label: 'Home Services Revenue Desk',
    vertical: 'home-services',
    summary: 'Emergency-first call handling for HVAC, plumbing, electrical, and garage operators.',
    positioning: 'Qualify urgency, collect address and system details fast, then route to booking or dispatch without losing the lead.',
    leadSchema: {
      requiredFields: [
        { key: 'caller_name', label: 'Caller name', description: 'Primary contact for the service request.', kind: 'text', required: true },
        { key: 'callback_number', label: 'Callback number', description: 'Best reachable phone number.', kind: 'phone', required: true },
        { key: 'service_needed', label: 'Service needed', description: 'What kind of job the caller needs help with.', kind: 'choice', required: true, choices: ['HVAC', 'Plumbing', 'Electrical', 'Garage', 'General'] },
        { key: 'urgency', label: 'Urgency', description: 'How time-sensitive the request is.', kind: 'choice', required: true, choices: ['Emergency', 'Same day', 'This week', 'Flexible'] },
      ],
      optionalFields: [
        { key: 'property_address', label: 'Property address', description: 'Street or zip to support dispatch.', kind: 'text', required: false },
        { key: 'issue_notes', label: 'Issue notes', description: 'Symptoms, equipment, and failure details.', kind: 'multiline', required: false },
      ],
    },
    gradingRubric: [
      { id: 'speed', label: 'Speed to qualification', weight: 35, successDefinition: 'Assistant reaches service + urgency + callback data quickly.' },
      { id: 'dispatch', label: 'Dispatch readiness', weight: 35, successDefinition: 'The transcript contains enough operational data to book or route.' },
      { id: 'brand', label: 'Brand control', weight: 30, successDefinition: 'Tone stays calm, capable, and non-robotic for stressed callers.' },
    ],
    voicePreset: { provider: 'openai', voiceId: 'cedar', style: 'Confident, operational, concise.' },
    toolPreset: {
      knowledgeMode: 'qualification-first',
      approvedToggles: ['booking_rules', 'service-area', 'after-hours-handoff'],
      protectedToggles: ['compliance', 'refund-policy', 'emergency-routing'],
    },
    testScenarios: [
      { id: 'after-hours-no-cool', label: 'After-hours emergency', prompt: 'My AC is out and the house is 89 degrees right now.', expectedOutcome: 'Captures urgency, service, callback, and dispatch notes.' },
      { id: 'quote-request', label: 'Quote request', prompt: 'I need someone to quote a new unit this month.', expectedOutcome: 'Qualifies timeline and routes to non-emergency sales follow-up.' },
    ],
    docs: {
      operatorGuide: '/docs/VOICEOPS_OPERATOR_GUIDE.md',
      revisionGuide: '/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md',
      recoveryGuide: '/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md',
    },
  },
  {
    id: 'icp-dental',
    slug: 'dental',
    label: 'Dental Front Desk',
    vertical: 'dental',
    summary: 'Appointment-oriented intake for general dentistry, cosmetic consults, and emergency visits.',
    positioning: 'Sound like a polished front desk, collect patient readiness details, and keep the handoff clean for scheduling teams.',
    leadSchema: {
      requiredFields: [
        { key: 'patient_name', label: 'Patient name', description: 'Name of the person seeking care.', kind: 'text', required: true },
        { key: 'phone', label: 'Phone', description: 'Best callback number.', kind: 'phone', required: true },
        { key: 'visit_type', label: 'Visit type', description: 'Service or appointment intent.', kind: 'choice', required: true, choices: ['Emergency', 'Cleaning', 'Consult', 'Implant', 'Cosmetic', 'General'] },
        { key: 'new_patient', label: 'New patient', description: 'Whether they are new to the practice.', kind: 'boolean', required: true },
      ],
      optionalFields: [
        { key: 'insurance', label: 'Insurance', description: 'Insurance or self-pay signal.', kind: 'text', required: false },
        { key: 'preferred_time', label: 'Preferred time', description: 'Preferred callback or appointment window.', kind: 'text', required: false },
      ],
    },
    gradingRubric: [
      { id: 'warmth', label: 'Front desk warmth', weight: 30, successDefinition: 'Calls feel welcoming and human, especially for nervous patients.' },
      { id: 'qualification', label: 'Qualification completeness', weight: 40, successDefinition: 'Visit type, new/existing status, and callback data are captured.' },
      { id: 'conversion', label: 'Booking intent', weight: 30, successDefinition: 'Call ends with a concrete next step or schedule-ready note.' },
    ],
    voicePreset: { provider: 'openai', voiceId: 'marin', style: 'Warm, polished, reassuring.' },
    toolPreset: {
      knowledgeMode: 'faq-first',
      approvedToggles: ['office-hours', 'insurance-notes', 'consult-routing'],
      protectedToggles: ['medical-disclaimers', 'financing-policy', 'clinical-claims'],
    },
    testScenarios: [
      { id: 'new-patient-cleaning', label: 'New patient cleaning', prompt: 'I just moved here and need a cleaning next week.', expectedOutcome: 'Captures patient status, callback, and preferred schedule.' },
      { id: 'emergency-tooth-pain', label: 'Emergency pain', prompt: 'My tooth is killing me and I need to know if you can see me today.', expectedOutcome: 'Urgent triage with empathetic tone and clear next step.' },
    ],
    docs: {
      operatorGuide: '/docs/VOICEOPS_OPERATOR_GUIDE.md',
      revisionGuide: '/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md',
      recoveryGuide: '/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md',
    },
  },
  {
    id: 'icp-med-spa',
    slug: 'med-spa',
    label: 'Med Spa Consult Concierge',
    vertical: 'med-spa',
    summary: 'High-touch consult capture for aesthetics, injectables, body services, and treatment follow-up.',
    positioning: 'Make consult requests feel premium while still capturing the exact treatment intent and purchase signals the team needs.',
    leadSchema: {
      requiredFields: [
        { key: 'lead_name', label: 'Lead name', description: 'Prospective client full name.', kind: 'text', required: true },
        { key: 'phone', label: 'Phone', description: 'Best number for consult follow-up.', kind: 'phone', required: true },
        { key: 'treatment_interest', label: 'Treatment interest', description: 'Which service or result they want.', kind: 'choice', required: true, choices: ['Botox', 'Filler', 'Skin', 'Laser', 'Weight loss', 'Consult'] },
        { key: 'timeline', label: 'Timeline', description: 'How soon they want treatment.', kind: 'choice', required: true, choices: ['ASAP', 'This month', 'Next quarter', 'Researching'] },
      ],
      optionalFields: [
        { key: 'budget_band', label: 'Budget band', description: 'Optional spend signal if they volunteer it.', kind: 'text', required: false },
        { key: 'experience_level', label: 'Experience level', description: 'First time or repeat treatment familiarity.', kind: 'choice', required: false, choices: ['First time', 'Some experience', 'Repeat client'] },
      ],
    },
    gradingRubric: [
      { id: 'luxury-tone', label: 'Luxury tone', weight: 30, successDefinition: 'The assistant feels high-end, clear, and credible.' },
      { id: 'consult-readiness', label: 'Consult readiness', weight: 40, successDefinition: 'Interest, timeline, and callback details are captured.' },
      { id: 'objection-control', label: 'Objection handling', weight: 30, successDefinition: 'Pricing and safety questions are handled gracefully without over-claiming.' },
    ],
    voicePreset: { provider: 'openai', voiceId: 'alloy', style: 'Premium, calm, confidence-forward.' },
    toolPreset: {
      knowledgeMode: 'faq-first',
      approvedToggles: ['treatment-categories', 'consult-booking', 'financing-cta'],
      protectedToggles: ['medical-disclaimers', 'outcome-claims', 'eligibility-screening'],
    },
    testScenarios: [
      { id: 'first-time-botox', label: 'First-time Botox lead', prompt: 'I’ve never done Botox before. How does it work and what would I need to do first?', expectedOutcome: 'Premium consult capture without medical overreach.' },
      { id: 'price-shopping', label: 'Price shopper', prompt: 'I’m comparing a few med spas for filler. Can someone call me back today?', expectedOutcome: 'Captures urgency and callback while keeping consult framed around value.' },
    ],
    docs: {
      operatorGuide: '/docs/VOICEOPS_OPERATOR_GUIDE.md',
      revisionGuide: '/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md',
      recoveryGuide: '/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md',
    },
  },
  {
    id: 'icp-legal',
    slug: 'legal',
    label: 'Legal Intake Desk',
    vertical: 'legal',
    summary: 'Matter-intake oriented conversations for firms that need fast qualification without over-promising.',
    positioning: 'Capture the case shape, urgency, and jurisdiction clues, then tee up a clean attorney callback or consult.',
    leadSchema: {
      requiredFields: [
        { key: 'prospect_name', label: 'Prospect name', description: 'Caller or prospect name.', kind: 'text', required: true },
        { key: 'phone', label: 'Phone', description: 'Best callback number.', kind: 'phone', required: true },
        { key: 'matter_type', label: 'Matter type', description: 'Practice area or issue category.', kind: 'choice', required: true, choices: ['PI', 'Family', 'Criminal', 'Immigration', 'Business', 'Other'] },
        { key: 'urgency', label: 'Urgency', description: 'How time-sensitive the legal matter is.', kind: 'choice', required: true, choices: ['Immediate', 'This week', 'Soon', 'Researching'] },
      ],
      optionalFields: [
        { key: 'jurisdiction', label: 'Jurisdiction', description: 'State, county, or court context if known.', kind: 'text', required: false },
        { key: 'conflict_name', label: 'Conflict check name', description: 'Opposing party or related name if volunteered.', kind: 'text', required: false },
      ],
    },
    gradingRubric: [
      { id: 'safety', label: 'Legal safety', weight: 35, successDefinition: 'No legal advice; language stays intake-safe and compliant.' },
      { id: 'matter-fit', label: 'Matter fit', weight: 35, successDefinition: 'Matter type, urgency, and callback are captured.' },
      { id: 'trust', label: 'Trust and professionalism', weight: 30, successDefinition: 'The assistant sounds serious, clear, and competent.' },
    ],
    voicePreset: { provider: 'openai', voiceId: 'verse', style: 'Composed, serious, trust-building.' },
    toolPreset: {
      knowledgeMode: 'handoff-first',
      approvedToggles: ['practice-areas', 'consult-routing', 'office-hours'],
      protectedToggles: ['legal-advice', 'settlement-claims', 'guarantees'],
    },
    testScenarios: [
      { id: 'family-law-intake', label: 'Family law consult', prompt: 'I need to talk to someone about a custody issue this week.', expectedOutcome: 'Captures matter type, urgency, and safe callback path.' },
      { id: 'pi-urgent', label: 'Personal injury urgency', prompt: 'I was in a car accident yesterday and I’m trying to figure out what to do next.', expectedOutcome: 'Strong professional tone and clean intake without giving legal advice.' },
    ],
    docs: {
      operatorGuide: '/docs/VOICEOPS_OPERATOR_GUIDE.md',
      revisionGuide: '/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md',
      recoveryGuide: '/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md',
    },
  },
];

export const clientPlaygroundScenarios: ClientPlaygroundScenario[] = icpTemplatePacks.flatMap((pack) =>
  pack.testScenarios.map((scenario) => ({
    id: `${pack.id}-${scenario.id}`,
    icpPackId: pack.id,
    label: scenario.label,
    description: scenario.expectedOutcome,
    defaultPrompt: scenario.prompt,
    expectedSignals: pack.leadSchema.requiredFields.map((field) => field.label),
  })),
);

export const playbookDocuments: PlaybookDocument[] = [
  {
    id: 'playbook-demo-spinup',
    label: 'Spin Up a Managed Demo',
    summary: 'Reserve a number, clone the right ICP pack, publish the assistant, and launch a test call.',
    href: '/docs/VOICEOPS_DEMO_SPINUP.md',
    audience: 'operator',
  },
  {
    id: 'playbook-icp-revision',
    label: 'Revise an ICP Pack',
    summary: 'Change prompt blocks, field schema, grading, and approved tool toggles without breaking client safety.',
    href: '/docs/VOICEOPS_ICP_REVISION_WORKFLOW.md',
    audience: 'operator',
  },
  {
    id: 'playbook-lead-recovery',
    label: 'Recover Failed Lead Data',
    summary: 'Review transcript fallbacks, rerun Gemini extraction, and escalate uncertain calls for operator QA.',
    href: '/docs/VOICEOPS_LEAD_RECOVERY_RUNBOOK.md',
    audience: 'both',
  },
  {
    id: 'playbook-client-playground',
    label: 'Client Playground Guide',
    summary: 'How clients run safe self-test calls, interpret results, and request revisions with evidence.',
    href: '/docs/VOICEOPS_CLIENT_PLAYGROUND.md',
    audience: 'client',
  },
];

export function getIcpTemplatePack(id: string | null | undefined) {
  return icpTemplatePacks.find((pack) => pack.id === id) ?? icpTemplatePacks[0];
}
