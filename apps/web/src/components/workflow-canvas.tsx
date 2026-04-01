'use client';

import { useMemo, useState, useTransition } from 'react';

import { MermaidPreview } from '@/components/mermaid-preview';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '@/lib/types';

type WorkflowCanvasProps = {
  organizationId?: string;
  initialBoard: WorkflowBoard | null;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
} | null;

const toneClasses = {
  metal: 'node-metal',
  mint: 'node-mint',
  amber: 'node-amber',
} as const;

function buildBoardState(board: WorkflowBoard | null): WorkflowBoard {
  return (
    board ?? {
      title: 'Workflow Canvas',
      description: 'Describe the stages, objections, handoffs, and outcomes.',
      nodes: [],
      edges: [],
    }
  );
}

function toMermaid(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
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

function getNodeCenter(node: WorkflowNode) {
  return {
    x: node.x + 136,
    y: node.y + 84,
  };
}

export function WorkflowCanvas({ organizationId, initialBoard }: WorkflowCanvasProps) {
  const seedBoard = buildBoardState(initialBoard);
  const [boardId, setBoardId] = useState(initialBoard?.id);
  const [title, setTitle] = useState(seedBoard.title);
  const [description, setDescription] = useState(seedBoard.description);
  const [nodes, setNodes] = useState(seedBoard.nodes);
  const [edges, setEdges] = useState(seedBoard.edges);
  const [dragState, setDragState] = useState<DragState>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, startSaving] = useTransition();

  const mermaidChart = useMemo(() => toMermaid(nodes, edges), [edges, nodes]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = event.clientX - bounds.left - dragState.offsetX;
    const nextY = event.clientY - bounds.top - dragState.offsetY;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === dragState.nodeId
          ? {
              ...node,
              x: Math.max(16, Math.min(nextX, bounds.width - 288)),
              y: Math.max(16, Math.min(nextY, bounds.height - 180)),
            }
          : node,
      ),
    );
  }

  function handleNodeClick(nodeId: string) {
    if (!linkMode) {
      return;
    }

    if (!linkSource) {
      setLinkSource(nodeId);
      return;
    }

    if (linkSource !== nodeId) {
      setEdges((current) => [
        ...current,
        {
          id: `edge-${linkSource}-${nodeId}-${current.length + 1}`,
          from: linkSource,
          to: nodeId,
          label: 'next',
        },
      ]);
    }

    setLinkSource(null);
    setLinkMode(false);
  }

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Canvas builder</span>
          <h3>Visual workflow mapping</h3>
        </div>
        <div className="button-row">
          <button
            className={`ghost-button ${linkMode ? 'is-active' : ''}`}
            type="button"
            onClick={() => {
              setLinkMode((current) => !current);
              setLinkSource(null);
            }}
          >
            {linkMode ? 'Cancel linking' : 'Link nodes'}
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              const id = `node-${nodes.length + 1}`;
              setNodes((current) => [
                ...current,
                {
                  id,
                  title: 'New note',
                  body: 'Describe the step or handoff.',
                  x: 64 + current.length * 24,
                  y: 72 + current.length * 24,
                  tone: 'metal',
                },
              ]);
            }}
          >
            Add note
          </button>

          <button
            className="liquid-button"
            type="button"
            disabled={isSaving || !organizationId}
            onClick={() => {
              if (!organizationId) {
                setSaveMessage('Choose an organization before saving the workflow board.');
                return;
              }

              startSaving(async () => {
                const response = await fetch('/api/workflow-boards', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: boardId,
                    organizationId,
                    title,
                    description,
                    nodes,
                    edges,
                  }),
                });

                const payload = (await response.json()) as { id?: string; message?: string; error?: string };

                if (!response.ok) {
                  setSaveMessage(payload.error ?? 'Unable to save the workflow board.');
                  return;
                }

                if (payload.id) {
                  setBoardId(payload.id);
                }

                setSaveMessage(payload.message ?? 'Workflow board saved.');
              });
            }}
          >
            {isSaving ? 'Saving...' : 'Save board'}
          </button>
        </div>
      </div>

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="form-grid">
            <label className="field field-span-2">
              <span>Board title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="field field-span-2">
              <span>Description</span>
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>

          <div
            className="canvas-surface"
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDragState(null)}
            onPointerLeave={() => setDragState(null)}
          >
            <svg className="canvas-lines" viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
              {edges.map((edge) => {
                const from = nodes.find((node) => node.id === edge.from);
                const to = nodes.find((node) => node.id === edge.to);

                if (!from || !to) {
                  return null;
                }

                const fromCenter = getNodeCenter(from);
                const toCenter = getNodeCenter(to);
                const curveX = (fromCenter.x + toCenter.x) / 2;

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${fromCenter.x} ${fromCenter.y} C ${curveX} ${fromCenter.y}, ${curveX} ${toCenter.y}, ${toCenter.x} ${toCenter.y}`}
                      className="canvas-path"
                    />
                    {edge.label ? (
                      <text x={curveX} y={(fromCenter.y + toCenter.y) / 2 - 8} textAnchor="middle" className="canvas-label">
                        {edge.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {nodes.length ? (
              nodes.map((node) => (
                <article
                  key={node.id}
                  className={`canvas-node ${toneClasses[node.tone ?? 'metal']} ${linkSource === node.id ? 'is-source' : ''}`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <div
                    className="node-handle"
                    onPointerDown={(event) => {
                      const bounds = (event.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                      setDragState({
                        nodeId: node.id,
                        offsetX: event.clientX - bounds.left,
                        offsetY: event.clientY - bounds.top,
                      });
                    }}
                  >
                    <span>{node.title}</span>
                    <small>{node.id}</small>
                  </div>

                  <label className="node-field">
                    <span>Title</span>
                    <input
                      value={node.title}
                      onChange={(event) => {
                        setNodes((current) =>
                          current.map((item) => (item.id === node.id ? { ...item, title: event.target.value } : item)),
                        );
                      }}
                    />
                  </label>

                  <label className="node-field">
                    <span>Note</span>
                    <textarea
                      value={node.body}
                      onChange={(event) => {
                        setNodes((current) =>
                          current.map((item) => (item.id === node.id ? { ...item, body: event.target.value } : item)),
                        );
                      }}
                    />
                  </label>
                </article>
              ))
            ) : (
              <div className="canvas-empty">
                Add notes to map the call flow, handoffs, or booking sequence before showing the client.
              </div>
            )}
          </div>

          {saveMessage ? <p className="notice">{saveMessage}</p> : null}
        </div>

        <div className="stack-panel">
          <div className="glass-card workspace-card">
            <div className="card-header">
              <div>
                <span className="eyebrow-text">Mermaid export</span>
                <h3>Deck-ready output</h3>
              </div>
            </div>
            <pre className="code-block">{mermaidChart}</pre>
          </div>

          <div className="glass-card workspace-card">
            <div className="card-header">
              <div>
                <span className="eyebrow-text">Rendered preview</span>
                <h3>Visual output</h3>
              </div>
            </div>
            <MermaidPreview chart={mermaidChart} />
          </div>
        </div>
      </div>
    </section>
  );
}
