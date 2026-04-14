import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '@/lib/types';

export const DEFAULT_WORKFLOW_PHASES = ['Discovery', 'Qualification', 'Routing', 'Follow-Up', 'Outcome'] as const;

export const WORKFLOW_NODE_KINDS: Array<NonNullable<WorkflowNode['kind']>> = [
  'step',
  'decision',
  'handoff',
  'system',
  'outcome',
];

function sanitizeMermaidText(value: string) {
  return value.replace(/"/g, "'").replace(/\n+/g, '<br/>').trim();
}

function mermaidNodeShape(node: WorkflowNode, label: string) {
  switch (node.kind) {
    case 'decision':
      return `${node.id}{"${label}"}`;
    case 'outcome':
      return `${node.id}(["${label}"])`;
    default:
      return `${node.id}["${label}"]`;
  }
}

function mermaidNodeClass(node: WorkflowNode) {
  if (node.kind === 'decision') {
    return 'decision';
  }

  if (node.kind === 'handoff') {
    return 'handoff';
  }

  if (node.kind === 'outcome') {
    return 'outcome';
  }

  if (node.kind === 'system') {
    return 'system';
  }

  return node.tone === 'mint' ? 'accent' : node.tone === 'amber' ? 'warning' : 'default';
}

export function buildWorkflowTemplateDeck(): WorkflowBoard[] {
  return [
    {
      title: 'Inbound qualification',
      description: 'Initial discovery, qualification, routing, and follow-up for inbound calls.',
      nodes: [
        { id: 'discover', title: 'Open conversation', body: 'Identify caller intent and collect essentials.', x: 0, y: 0, phase: 'Discovery', kind: 'step', tone: 'metal' },
        { id: 'qualify', title: 'Qualify lead', body: 'Check fit, urgency, location, and budget signals.', x: 0, y: 0, phase: 'Qualification', kind: 'decision', tone: 'amber' },
        { id: 'route', title: 'Route priority caller', body: 'Send qualified calls to the correct team or calendar.', x: 0, y: 0, phase: 'Routing', kind: 'handoff', tone: 'mint' },
        { id: 'follow', title: 'Trigger follow-up', body: 'Create CRM note, text recap, and task assignment.', x: 0, y: 0, phase: 'Follow-Up', kind: 'system', tone: 'metal' },
        { id: 'close', title: 'Outcome recorded', body: 'Mark booked, nurture, or lost in the system of record.', x: 0, y: 0, phase: 'Outcome', kind: 'outcome', tone: 'mint' },
      ],
      edges: [
        { id: 'e1', from: 'discover', to: 'qualify', label: 'capture context' },
        { id: 'e2', from: 'qualify', to: 'route', label: 'qualified' },
        { id: 'e3', from: 'route', to: 'follow', label: 'handoff' },
        { id: 'e4', from: 'follow', to: 'close', label: 'sync result' },
      ],
      metadata: {
        isTemplate: true,
        phaseOrder: [...DEFAULT_WORKFLOW_PHASES],
        sharedLabel: 'Inbound qualification template',
      },
    },
    {
      title: 'Outbound reactivation',
      description: 'Reactivation flow for outbound campaigns with objections and appointment booking.',
      nodes: [
        { id: 'intro', title: 'Personalized opener', body: 'State why the system is reaching out and confirm identity.', x: 0, y: 0, phase: 'Discovery', kind: 'step', tone: 'metal' },
        { id: 'intent', title: 'Interest check', body: 'Measure interest and branch objections or readiness.', x: 0, y: 0, phase: 'Qualification', kind: 'decision', tone: 'amber' },
        { id: 'book', title: 'Book next step', body: 'Route to booking, transfer, or callback queue.', x: 0, y: 0, phase: 'Routing', kind: 'handoff', tone: 'mint' },
        { id: 'nurture', title: 'Send nurture recap', body: 'Deliver sms/email summary and next-touch trigger.', x: 0, y: 0, phase: 'Follow-Up', kind: 'system', tone: 'metal' },
        { id: 'result', title: 'Campaign result', body: 'Track appointment booked, nurture, do-not-call, or no answer.', x: 0, y: 0, phase: 'Outcome', kind: 'outcome', tone: 'mint' },
      ],
      edges: [
        { id: 'oe1', from: 'intro', to: 'intent', label: 'conversation active' },
        { id: 'oe2', from: 'intent', to: 'book', label: 'ready now' },
        { id: 'oe3', from: 'intent', to: 'nurture', label: 'later / objection' },
        { id: 'oe4', from: 'book', to: 'result', label: 'confirmed' },
        { id: 'oe5', from: 'nurture', to: 'result', label: 'logged' },
      ],
      metadata: {
        isTemplate: true,
        phaseOrder: [...DEFAULT_WORKFLOW_PHASES],
        sharedLabel: 'Outbound reactivation template',
      },
    },
  ];
}

export function workflowBoardToMermaid(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  phaseOrder?: string[],
) {
  const lines = ['flowchart LR'];
  const phases = phaseOrder?.length ? [...phaseOrder] : [...DEFAULT_WORKFLOW_PHASES];
  const nodePhases = Array.from(
    new Set(nodes.map((node) => node.phase).filter((value): value is string => Boolean(value?.trim()))),
  );

  for (const phase of nodePhases) {
    if (!phases.includes(phase)) {
      phases.push(phase);
    }
  }

  const unphased = nodes.filter((node) => !node.phase);

  for (const phase of phases) {
    const phaseNodes = nodes.filter((node) => node.phase === phase);

    if (!phaseNodes.length) {
      continue;
    }

    const phaseId = phase.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    lines.push(`subgraph phase_${phaseId}["${sanitizeMermaidText(phase)}"]`);
    lines.push('direction TB');

    for (const node of phaseNodes) {
      const safeLabel = sanitizeMermaidText(`${node.title}: ${node.body}`);
      lines.push(mermaidNodeShape(node, safeLabel));
    }

    lines.push('end');
  }

  for (const node of unphased) {
    const safeLabel = sanitizeMermaidText(`${node.title}: ${node.body}`);
    lines.push(mermaidNodeShape(node, safeLabel));
  }

  for (const node of nodes) {
    lines.push(`class ${node.id} ${mermaidNodeClass(node)}`);
  }

  for (const edge of edges) {
    if (edge.label?.trim()) {
      lines.push(`${edge.from} -->|${sanitizeMermaidText(edge.label)}| ${edge.to}`);
    } else {
      lines.push(`${edge.from} --> ${edge.to}`);
    }
  }

  lines.push('classDef default fill:#16181b,stroke:#43484f,color:#f5f5f5,stroke-width:1px');
  lines.push('classDef accent fill:#18221d,stroke:#4c8a71,color:#f5f5f5,stroke-width:1px');
  lines.push('classDef warning fill:#231f18,stroke:#8f6a32,color:#f5f5f5,stroke-width:1px');
  lines.push('classDef decision fill:#201d16,stroke:#c28d42,color:#f5f5f5,stroke-width:1.4px');
  lines.push('classDef handoff fill:#17211f,stroke:#4d8a7f,color:#f5f5f5,stroke-width:1.4px');
  lines.push('classDef system fill:#181a21,stroke:#59657d,color:#f5f5f5,stroke-width:1.2px');
  lines.push('classDef outcome fill:#1d2018,stroke:#7fa356,color:#f5f5f5,stroke-width:1.5px');

  return lines.join('\n');
}
