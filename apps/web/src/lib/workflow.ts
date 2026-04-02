import type { WorkflowEdge, WorkflowNode } from '@/lib/types';

export function workflowBoardToMermaid(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const lines = ['flowchart LR'];

  for (const node of nodes) {
    const safeTitle = `${node.title}: ${node.body}`.replace(/"/g, "'");
    lines.push(`${node.id}["${safeTitle}"]`);
  }

  for (const edge of edges) {
    if (edge.label?.trim()) {
      lines.push(`${edge.from} -->|${edge.label.replace(/"/g, "'")}| ${edge.to}`);
    } else {
      lines.push(`${edge.from} --> ${edge.to}`);
    }
  }

  return lines.join('\n');
}
