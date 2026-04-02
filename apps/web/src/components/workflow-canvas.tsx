'use client';

import { useMemo, useState, useTransition } from 'react';
import { Copy, Link2, Plus, Save, Trash2, X } from 'lucide-react';

import { MermaidPreview } from '@/components/mermaid-preview';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '@/lib/types';
import { workflowBoardToMermaid } from '@/lib/workflow';

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
      description: 'Map the live routing, handoffs, and outcomes.',
      nodes: [],
      edges: [],
    }
  );
}

function getNodeCenter(node: WorkflowNode) {
  return {
    x: node.x + 154,
    y: node.y + 77,
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
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(seedBoard.nodes[0]?.id ?? null);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, startSaving] = useTransition();

  const mermaidChart = useMemo(() => workflowBoardToMermaid(nodes, edges), [edges, nodes]);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedNodeEdges = selectedNode
    ? edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
    : [];

  function addNode(tone: WorkflowNode['tone'] = 'metal') {
    const id = `node-${nodes.length + 1}`;

    setNodes((current) => [
      ...current,
      {
        id,
        title: tone === 'amber' ? 'Decision' : 'Step',
        body: tone === 'amber' ? 'Branch or qualify here.' : 'Describe the next action.',
        x: 80 + current.length * 28,
        y: 88 + current.length * 24,
        tone,
      },
    ]);
    setSelectedNodeId(id);
  }

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
              x: Math.max(20, Math.min(nextX, bounds.width - 340)),
              y: Math.max(20, Math.min(nextY, bounds.height - 188)),
            }
          : node,
      ),
    );
  }

  function startLink(nodeId: string) {
    setLinkSource((current) => (current === nodeId ? null : nodeId));
    setSaveMessage('');
  }

  function completeLink(nodeId: string) {
    if (!linkSource || linkSource === nodeId) {
      return;
    }

    const duplicate = edges.some((edge) => edge.from === linkSource && edge.to === nodeId);

    if (duplicate) {
      setLinkSource(null);
      setSaveMessage('Those nodes are already linked.');
      return;
    }

    setEdges((current) => [
      ...current,
      {
        id: `edge-${linkSource}-${nodeId}-${current.length + 1}`,
        from: linkSource,
        to: nodeId,
        label: 'next',
      },
    ]);

    setLinkSource(null);
  }

  return (
    <section className="workflow-studio">
      <div className="glass-card workflow-toolbar">
        <div className="workflow-toolbar-copy">
          <span className="eyebrow-text">Workflow board</span>
          <input
            className="workflow-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Workflow title"
          />
          <p>
            {nodes.length} nodes • {edges.length} links
            {linkSource ? ` • linking from ${linkSource}` : ''}
            {boardId ? ` • board ${boardId.slice(0, 8)}` : ' • unsaved'}
          </p>
        </div>

        <div className="button-row workflow-toolbar-actions">
          <button className="ghost-button" type="button" onClick={() => addNode('metal')}>
            <Plus size={16} />
            <span>Add node</span>
          </button>

          <button className="ghost-button" type="button" onClick={() => addNode('amber')}>
            <Plus size={16} />
            <span>Add branch</span>
          </button>

          <button
            className={`ghost-button ${linkSource ? 'is-active' : ''}`}
            type="button"
            onClick={() => {
              setLinkSource(null);
            }}
          >
            <Link2 size={16} />
            <span>{linkSource ? 'Cancel link' : 'Link nodes'}</span>
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={async () => {
              if (!boardId) {
                setSaveMessage('Save the board before sharing it.');
                return;
              }

              const shareUrl = `${window.location.origin}/workflow-share/${boardId}`;
              await navigator.clipboard.writeText(shareUrl);
              setSaveMessage('Share URL copied.');
            }}
          >
            <Copy size={16} />
            <span>Share URL</span>
          </button>

          <button
            className="liquid-button"
            type="button"
            disabled={isSaving || !organizationId}
            onClick={() => {
              if (!organizationId) {
                setSaveMessage('Choose an organization before saving.');
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
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save board'}</span>
          </button>
        </div>
      </div>

      <div className="workflow-layout">
        <div className="glass-card workflow-board-panel">
          <div
            className="workflow-canvas-frame"
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
                  className={`canvas-node workflow-node ${toneClasses[node.tone ?? 'metal']} ${
                    selectedNodeId === node.id ? 'is-selected' : ''
                  } ${linkSource === node.id ? 'is-source' : ''}`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <button
                    className={`workflow-port workflow-port-in ${linkSource ? 'is-active' : ''}`}
                    type="button"
                    aria-label={`Link into ${node.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      completeLink(node.id);
                    }}
                  >
                    <span />
                  </button>

                  <button
                    className={`workflow-port workflow-port-out ${linkSource === node.id ? 'is-active' : ''}`}
                    type="button"
                    aria-label={`Link out from ${node.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      startLink(node.id);
                    }}
                  >
                    <span />
                  </button>

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

                  <p>{node.body}</p>
                </article>
              ))
            ) : (
              <div className="canvas-empty workflow-empty">
                Add a node to start mapping routing, objections, booking handoff, or escalation logic.
              </div>
            )}
          </div>
        </div>

        <aside className="workflow-side-stack">
          <div className="glass-card workflow-inspector">
            <div className="workflow-side-head">
              <div>
                <span className="eyebrow-text">Inspector</span>
                <h3>{selectedNode ? selectedNode.title : 'Board details'}</h3>
              </div>

              {selectedNode ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    const nextSelectedId = nodes.find((node) => node.id !== selectedNode.id)?.id ?? null;
                    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
                    setEdges((current) => current.filter((edge) => edge.from !== selectedNode.id && edge.to !== selectedNode.id));
                    setSelectedNodeId(nextSelectedId);
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              ) : null}
            </div>

            {selectedNode ? (
              <div className="workflow-field-stack">
                <label className="field">
                  <span>Node title</span>
                  <input
                    value={selectedNode.title}
                    onChange={(event) => {
                      setNodes((current) =>
                        current.map((node) => (node.id === selectedNode.id ? { ...node, title: event.target.value } : node)),
                      );
                    }}
                  />
                </label>

                <label className="field">
                  <span>Node type</span>
                  <select
                    className="select-field"
                    value={selectedNode.tone ?? 'metal'}
                    onChange={(event) => {
                      setNodes((current) =>
                        current.map((node) =>
                          node.id === selectedNode.id
                            ? { ...node, tone: event.target.value as WorkflowNode['tone'] }
                            : node,
                        ),
                      );
                    }}
                  >
                    <option value="metal">Standard</option>
                    <option value="mint">Live handoff</option>
                    <option value="amber">Decision</option>
                  </select>
                </label>

                <label className="field">
                  <span>Node note</span>
                  <textarea
                    rows={6}
                    value={selectedNode.body}
                    onChange={(event) => {
                      setNodes((current) =>
                        current.map((node) => (node.id === selectedNode.id ? { ...node, body: event.target.value } : node)),
                      );
                    }}
                  />
                </label>

                <div className="workflow-connection-panel">
                  <div className="workflow-connection-head">
                    <span>Connections</span>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => startLink(selectedNode.id)}
                    >
                      <Link2 size={16} />
                      <span>{linkSource === selectedNode.id ? 'Linking...' : 'Start link'}</span>
                    </button>
                  </div>

                  <div className="workflow-connection-list">
                    {selectedNodeEdges.length ? (
                      selectedNodeEdges.map((edge) => (
                        <div key={edge.id} className="workflow-connection-row">
                          <div className="workflow-connection-meta">
                            <strong>
                              {edge.from === selectedNode.id ? 'Out' : 'In'}:
                              {' '}
                              {edge.from === selectedNode.id ? edge.to : edge.from}
                            </strong>
                            <input
                              value={edge.label ?? ''}
                              onChange={(event) => {
                                setEdges((current) =>
                                  current.map((item) =>
                                    item.id === edge.id ? { ...item, label: event.target.value } : item,
                                  ),
                                );
                              }}
                              placeholder="label"
                            />
                          </div>
                          <button
                            className="workflow-edge-delete"
                            type="button"
                            aria-label="Delete connection"
                            onClick={() => {
                              setEdges((current) => current.filter((item) => item.id !== edge.id));
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="ops-empty-state">No connections on this node yet.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="workflow-field-stack">
                <label className="field">
                  <span>Board summary</span>
                  <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>

                <div className="ops-kv-grid">
                  <article className="ops-log-card">
                    <span>Nodes</span>
                    <strong>{nodes.length}</strong>
                  </article>
                  <article className="ops-log-card">
                    <span>Links</span>
                    <strong>{edges.length}</strong>
                  </article>
                </div>
              </div>
            )}

            {saveMessage ? <p className="notice">{saveMessage}</p> : null}
          </div>

          <div className="glass-card workflow-preview-panel">
            <div className="workflow-side-head">
              <div>
                <span className="eyebrow-text">Share output</span>
                <h3>Mermaid preview</h3>
              </div>
            </div>

            <pre className="code-block compact-code">{mermaidChart}</pre>
            <MermaidPreview chart={mermaidChart} />
          </div>
        </aside>
      </div>
    </section>
  );
}
