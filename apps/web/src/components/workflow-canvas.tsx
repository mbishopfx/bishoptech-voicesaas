'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowRight,
  Copy,
  Download,
  GitBranchPlus,
  Link2,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { MermaidPreview } from '@/components/mermaid-preview';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { WorkflowBoard, WorkflowNode } from '@/lib/types';
import {
  buildWorkflowTemplateDeck,
  DEFAULT_WORKFLOW_PHASES,
  workflowBoardToMermaid,
  WORKFLOW_NODE_KINDS,
} from '@/lib/workflow';

type WorkflowCanvasProps = {
  organizationId?: string;
  initialBoard: WorkflowBoard | null;
};

type WorkflowBoardResponse = {
  boards?: WorkflowBoard[];
  error?: string;
};

function createNodeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `node-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `node-${Math.random().toString(36).slice(2, 10)}`;
}

function createEdgeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `edge-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `edge-${Math.random().toString(36).slice(2, 10)}`;
}

function buildBoardState(board: WorkflowBoard | null): WorkflowBoard {
  const phaseOrder =
    board?.metadata?.phaseOrder?.length
      ? board.metadata.phaseOrder
      : [...DEFAULT_WORKFLOW_PHASES];

  return {
    id: board?.id,
    organizationId: board?.organizationId,
    title: board?.title ?? 'Workflow Canvas',
    description:
      board?.description ?? 'Map the live routing, handoffs, and capture steps before you present the workflow.',
    nodes: (board?.nodes ?? []).map((node) => ({
      ...node,
      x: node.x ?? 0,
      y: node.y ?? 0,
      phase: node.phase ?? phaseOrder[0],
      kind: node.kind ?? 'step',
      tone: node.tone ?? 'metal',
    })),
    edges: board?.edges ?? [],
    metadata: {
      isTemplate: board?.metadata?.isTemplate === true,
      phaseOrder,
      sharedLabel: board?.metadata?.sharedLabel,
    },
    updatedAt: board?.updatedAt,
  };
}

function makeNode(phase: string, count: number): WorkflowNode {
  return {
    id: createNodeId(),
    title: `Step ${count + 1}`,
    body: 'Describe the action, decision, or handoff in this phase.',
    x: 0,
    y: 0,
    phase,
    kind: 'step',
    tone: 'metal',
  };
}

function getNodeTone(node: WorkflowNode) {
  if (node.kind === 'decision') {
    return 'warning';
  }

  if (node.kind === 'handoff' || node.kind === 'outcome') {
    return 'success';
  }

  if (node.kind === 'system') {
    return 'cyan';
  }

  return 'muted';
}

function getNodeClasses(node: WorkflowNode, selected: boolean, linkTarget: boolean) {
  const toneClass =
    node.kind === 'decision'
      ? 'border-amber-500/45 bg-amber-500/10'
      : node.kind === 'handoff' || node.kind === 'outcome'
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : node.kind === 'system'
          ? 'border-sky-500/40 bg-sky-500/10'
          : 'border-border/80 bg-muted/20';

  const selectedClass = selected ? 'ring-2 ring-foreground/30' : '';
  const linkClass = linkTarget ? 'ring-2 ring-emerald-400/50' : '';

  return `w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/30 ${toneClass} ${selectedClass} ${linkClass}`;
}

function parsePhaseInput(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getSvgDimensions(svg: string) {
  const viewBoxMatch = svg.match(/viewBox="[^"]*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i);

  if (viewBoxMatch) {
    return {
      width: Number(viewBoxMatch[3]) || 1600,
      height: Number(viewBoxMatch[4]) || 900,
    };
  }

  const widthMatch = svg.match(/width="(\d+(?:\.\d+)?)"/i);
  const heightMatch = svg.match(/height="(\d+(?:\.\d+)?)"/i);

  return {
    width: widthMatch ? Number(widthMatch[1]) : 1600,
    height: heightMatch ? Number(heightMatch[1]) : 900,
  };
}

export function WorkflowCanvas({ organizationId, initialBoard }: WorkflowCanvasProps) {
  const [board, setBoard] = useState<WorkflowBoard>(() => buildBoardState(initialBoard));
  const [boards, setBoards] = useState<WorkflowBoard[]>(initialBoard ? [buildBoardState(initialBoard)] : []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialBoard?.nodes[0]?.id ?? null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [newEdgeFrom, setNewEdgeFrom] = useState<string>('');
  const [newEdgeTo, setNewEdgeTo] = useState<string>('');
  const [newEdgeLabel, setNewEdgeLabel] = useState<string>('next');
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('studio');
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const defaultTemplates = useMemo(() => buildWorkflowTemplateDeck().map((template) => buildBoardState(template)), []);

  const phaseOrder = board.metadata?.phaseOrder?.length ? board.metadata.phaseOrder : [...DEFAULT_WORKFLOW_PHASES];
  const allPhases = useMemo(() => {
    const phases = [...phaseOrder];

    for (const node of board.nodes) {
      if (node.phase && !phases.includes(node.phase)) {
        phases.push(node.phase);
      }
    }

    return phases;
  }, [board.nodes, phaseOrder]);
  const selectedNode = board.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const templateBoards = boards.filter((item) => item.metadata?.isTemplate);
  const savedBoards = boards.filter((item) => !item.metadata?.isTemplate);
  const mermaidChart = useMemo(
    () => workflowBoardToMermaid(board.nodes, board.edges, allPhases),
    [allPhases, board.edges, board.nodes],
  );

  useEffect(() => {
    async function loadBoards() {
      if (!organizationId) {
        return;
      }

      setIsLoadingBoards(true);

      try {
        const response = await fetch(`/api/workflow-boards?organizationId=${encodeURIComponent(organizationId)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as WorkflowBoardResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load workflow boards.');
        }

        const hydrated = (payload.boards ?? []).map((item) => buildBoardState(item));
        setBoards(hydrated);

        if (board.id) {
          const live = hydrated.find((item) => item.id === board.id);
          if (live) {
            setBoard(live);
          }
        }
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : 'Unable to load workflow boards.');
      } finally {
        setIsLoadingBoards(false);
      }
    }

    void loadBoards();
  }, [organizationId]);

  function hydrateBoard(nextBoard: WorkflowBoard) {
    const hydrated = buildBoardState(nextBoard);
    setBoard(hydrated);
    setSelectedNodeId(hydrated.nodes[0]?.id ?? null);
    setLinkSourceId(null);
    setNewEdgeFrom('');
    setNewEdgeTo('');
    setSaveMessage('');
  }

  function updateBoard(patch: Partial<WorkflowBoard>) {
    setBoard((current) => ({
      ...current,
      ...patch,
      metadata: {
        ...(current.metadata ?? { phaseOrder: [...DEFAULT_WORKFLOW_PHASES], isTemplate: false }),
        ...(patch.metadata ?? {}),
      },
    }));
  }

  function updateNode(nodeId: string, patch: Partial<WorkflowNode>) {
    setBoard((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }));
  }

  function removeNode(nodeId: string) {
    setBoard((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    }));
    setSelectedNodeId((current) => (current === nodeId ? null : current));
    setLinkSourceId((current) => (current === nodeId ? null : current));
  }

  function addNode(phase: string) {
    setBoard((current) => {
      const nextNode = makeNode(phase, current.nodes.length);
      setSelectedNodeId(nextNode.id);
      return {
        ...current,
        nodes: [...current.nodes, nextNode],
      };
    });
  }

  function duplicateNode(nodeId: string) {
    const sourceNode = board.nodes.find((node) => node.id === nodeId);

    if (!sourceNode) {
      return;
    }

    const nextNode = {
      ...sourceNode,
      id: createNodeId(),
      title: `${sourceNode.title} copy`,
    };

    setBoard((current) => ({
      ...current,
      nodes: [...current.nodes, nextNode],
    }));
    setSelectedNodeId(nextNode.id);
  }

  function addEdge(from: string, to: string, label?: string) {
    if (!from || !to || from === to) {
      setSaveMessage('Choose two different steps to create a link.');
      return;
    }

    const exists = board.edges.some((edge) => edge.from === from && edge.to === to && (edge.label ?? '') === (label ?? ''));

    if (exists) {
      setSaveMessage('That step link already exists.');
      return;
    }

    setBoard((current) => ({
      ...current,
      edges: [
        ...current.edges,
        {
          id: createEdgeId(),
          from,
          to,
          label: label?.trim() || undefined,
        },
      ],
    }));
    setSaveMessage('Step link added.');
  }

  function removeEdge(edgeId: string) {
    setBoard((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== edgeId),
    }));
  }

  async function copyShareUrl() {
    if (!board.id) {
      setSaveMessage('Save the board before copying a share link.');
      return;
    }

    const shareUrl = `${window.location.origin}/workflow-share/${board.id}`;
    await navigator.clipboard.writeText(shareUrl);
    setSaveMessage('Share link copied.');
  }

  async function copyMermaidSource() {
    await navigator.clipboard.writeText(mermaidChart);
    setSaveMessage('Mermaid source copied.');
  }

  async function exportSvg() {
    if (!renderedSvg) {
      setSaveMessage('Open the Preview tab first so the workflow can render.');
      return;
    }

    downloadBlob(new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' }), `${board.title.toLowerCase().replace(/\s+/g, '-') || 'workflow'}.svg`);
    setSaveMessage('SVG export downloaded.');
  }

  async function exportPng() {
    if (!renderedSvg) {
      setSaveMessage('Open the Preview tab first so the workflow can render.');
      return;
    }

    const { width, height } = getSvgDimensions(renderedSvg);
    const scale = 2;
    const image = new Image();
    const svgBlob = new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render the workflow image.'));
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext('2d');

    if (!context) {
      URL.revokeObjectURL(svgUrl);
      throw new Error('Unable to open the export canvas.');
    }

    context.fillStyle = '#101214';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(svgUrl);

    const dataUrl = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${board.title.toLowerCase().replace(/\s+/g, '-') || 'workflow'}.png`;
    anchor.click();
    setSaveMessage('PNG export downloaded.');
  }

  function createNewBoardFromTemplate(template?: WorkflowBoard) {
    const next = buildBoardState(template ?? null);
    setBoard({
      ...next,
      id: undefined,
      organizationId,
      title: template ? `${template.title} copy` : 'Workflow Canvas',
      metadata: {
        ...(next.metadata ?? {}),
        isTemplate: false,
      },
    });
    setSelectedNodeId(next.nodes[0]?.id ?? null);
    setLinkSourceId(null);
    setSaveMessage(template ? 'Template loaded into a new board draft.' : 'New board started.');
  }

  function saveBoard(isTemplate: boolean) {
    if (!organizationId) {
      setSaveMessage('Choose an organization before saving.');
      return;
    }

    startSaving(async () => {
      const response = await fetch('/api/workflow-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: board.id,
          organizationId,
          title: board.title,
          description: board.description,
          nodes: board.nodes,
          edges: board.edges,
          metadata: {
            ...(board.metadata ?? {}),
            isTemplate,
            phaseOrder: allPhases,
          },
        }),
      });

      const payload = (await response.json()) as { id?: string; message?: string; error?: string };

      if (!response.ok) {
        setSaveMessage(payload.error ?? 'Unable to save the workflow board.');
        return;
      }

      const nextBoard = buildBoardState({
        ...board,
        id: payload.id ?? board.id,
        organizationId,
        metadata: {
          ...(board.metadata ?? {}),
          isTemplate,
          phaseOrder: allPhases,
        },
      });

      setBoard(nextBoard);
      setBoards((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextBoard.id);
        return [nextBoard, ...withoutCurrent];
      });
      setSaveMessage(payload.message ?? (isTemplate ? 'Workflow template saved.' : 'Workflow board saved.'));
    });
  }

  const edgeItems = board.edges.map((edge) => {
    const from = board.nodes.find((node) => node.id === edge.from);
    const to = board.nodes.find((node) => node.id === edge.to);

    return {
      ...edge,
      fromTitle: from?.title ?? edge.from,
      toTitle: to?.title ?? edge.to,
    };
  });

  const phaseColumns = allPhases.map((phase) => ({
    phase,
    nodes: board.nodes.filter((node) => node.phase === phase),
  }));

  const shareUrl = board.id && typeof window !== 'undefined' ? `${window.location.origin}/workflow-share/${board.id}` : '';

  return (
    <section className="space-y-6">
      <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
        <CardHeader className="gap-4 border-b border-border/70 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={board.metadata?.isTemplate ? 'warning' : 'cyan'}>
                {board.metadata?.isTemplate ? 'Template' : 'Board'}
              </Badge>
              <Badge tone="muted">{board.nodes.length} steps</Badge>
              <Badge tone="muted">{board.edges.length} links</Badge>
              {board.updatedAt ? <Badge tone="muted">Updated {board.updatedAt}</Badge> : null}
            </div>
            <CardTitle className="text-3xl tracking-[-0.05em]">{board.title}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">
              Build client-facing workflow maps with phase-based steps, explicit node linking, Mermaid previews, and export-ready share links.
            </CardDescription>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-md border-border/80 bg-transparent" onClick={() => createNewBoardFromTemplate()}>
              <Plus data-icon="inline-start" />
              New board
            </Button>
            <Button variant="outline" className="rounded-md border-border/80 bg-transparent" onClick={() => saveBoard(true)} disabled={isSaving || !organizationId}>
              <Sparkles data-icon="inline-start" />
              Save template
            </Button>
            <Button className="rounded-md" onClick={() => saveBoard(false)} disabled={isSaving || !organizationId}>
              <Save data-icon="inline-start" />
              {isSaving ? 'Saving...' : 'Save board'}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 px-5 py-4">
          <Button variant="ghost" size="sm" className="rounded-md" onClick={() => setActiveTab('preview')}>
            <Download data-icon="inline-start" />
            Preview and export
          </Button>
          <Button variant="ghost" size="sm" className="rounded-md" onClick={copyShareUrl} disabled={!board.id}>
            <Share2 data-icon="inline-start" />
            Copy share link
          </Button>
          {linkSourceId ? (
            <Badge tone="success">Linking from {board.nodes.find((node) => node.id === linkSourceId)?.title ?? linkSourceId}</Badge>
          ) : (
            <Badge tone="muted">Select “Link from” on any step, then click a target step.</Badge>
          )}
          {saveMessage ? <Alert className="ml-auto border-border/80 bg-muted/30 text-sm">{saveMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
            <div className="grid gap-6">
              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader title="Boards" description="Saved workflow boards for this workspace." />
                </CardHeader>
                <CardContent className="px-0 py-0">
                  <ScrollArea className="h-[360px]">
                    <div className="space-y-2 p-4">
                      {isLoadingBoards ? (
                        <div className="text-sm text-muted-foreground">Loading boards...</div>
                      ) : savedBoards.length ? (
                        savedBoards.map((item) => (
                          <button
                            key={item.id ?? item.title}
                            type="button"
                            onClick={() => hydrateBoard(item)}
                            className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                              item.id === board.id
                                ? 'border-foreground/25 bg-muted/30'
                                : 'border-border/80 bg-muted/15 hover:bg-muted/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                                <div className="text-xs text-muted-foreground">{item.updatedAt ?? 'Draft'}</div>
                              </div>
                              <ArrowRight className="size-4 text-muted-foreground" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                          No saved boards yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader title="Templates" description="Reusable workflow patterns for new customer builds." />
                </CardHeader>
                <CardContent className="space-y-2 px-4 py-4">
                  {[...templateBoards, ...defaultTemplates].map((item, index) => (
                    <button
                      key={`${item.title}-${index}`}
                      type="button"
                      onClick={() => createNewBoardFromTemplate(item)}
                      className="w-full rounded-lg border border-border/80 bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs leading-5 text-muted-foreground">{item.description}</div>
                        </div>
                        <Sparkles className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader title="Board settings" description="Title, description, phase order, and board mode." />
                </CardHeader>
                <CardContent className="grid gap-4 px-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workflow title</label>
                    <Input
                      value={board.title}
                      onChange={(event) => updateBoard({ title: event.target.value })}
                      className="rounded-md border-border/80 bg-background/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</label>
                    <Textarea
                      value={board.description}
                      onChange={(event) => updateBoard({ description: event.target.value })}
                      className="min-h-24 rounded-md border-border/80 bg-background/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phase order</label>
                    <Input
                      value={phaseOrder.join(', ')}
                      onChange={(event) =>
                        updateBoard({
                          metadata: {
                            ...(board.metadata ?? {}),
                            phaseOrder: parsePhaseInput(event.target.value),
                          },
                        })
                      }
                      className="rounded-md border-border/80 bg-background/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      {allPhases.map((phase) => (
                        <Badge key={phase} tone="muted">
                          {phase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader
                    title="Phase map"
                    description="Steps grouped by phase. Link mode creates a connection when you click a target step."
                  />
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex min-w-max gap-4 pb-2">
                      {phaseColumns.map(({ phase, nodes }) => (
                        <div key={phase} className="w-[280px] rounded-lg border border-border/80 bg-background/40 p-3 align-top">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phase</div>
                              <div className="mt-1 text-sm font-medium text-foreground">{phase}</div>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-md" onClick={() => addNode(phase)}>
                              <Plus data-icon="inline-start" />
                              Add
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {nodes.length ? (
                              nodes.map((node) => (
                                <div key={node.id} className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (linkSourceId && linkSourceId !== node.id) {
                                        addEdge(linkSourceId, node.id, newEdgeLabel);
                                        setLinkSourceId(null);
                                        return;
                                      }

                                      setSelectedNodeId(node.id);
                                    }}
                                    className={getNodeClasses(node, selectedNodeId === node.id, linkSourceId !== null && linkSourceId !== node.id)}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 space-y-1">
                                        <div className="truncate text-sm font-medium text-foreground">{node.title}</div>
                                        <div className="text-xs leading-5 text-muted-foreground">{node.body}</div>
                                      </div>
                                      <Badge tone={getNodeTone(node)}>{node.kind ?? 'step'}</Badge>
                                    </div>
                                  </button>
                                  <div className="flex items-center justify-between gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-md" onClick={() => setSelectedNodeId(node.id)}>
                                      Edit
                                    </Button>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="sm" className="rounded-md" onClick={() => setLinkSourceId(node.id)}>
                                        <Link2 data-icon="inline-start" />
                                        Link from
                                      </Button>
                                      <Button variant="ghost" size="sm" className="rounded-md" onClick={() => duplicateNode(node.id)}>
                                        Duplicate
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                No steps in this phase yet.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader title="Link builder" description="Create explicit links between workflow steps." />
                </CardHeader>
                <CardContent className="grid gap-3 px-4 py-4">
                  <Select value={newEdgeFrom} onValueChange={setNewEdgeFrom}>
                    <SelectTrigger className="w-full rounded-md border-border/80 bg-background/50">
                      <SelectValue placeholder="From step" />
                    </SelectTrigger>
                    <SelectContent>
                      {board.nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newEdgeTo} onValueChange={setNewEdgeTo}>
                    <SelectTrigger className="w-full rounded-md border-border/80 bg-background/50">
                      <SelectValue placeholder="To step" />
                    </SelectTrigger>
                    <SelectContent>
                      {board.nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newEdgeLabel}
                    onChange={(event) => setNewEdgeLabel(event.target.value)}
                    className="rounded-md border-border/80 bg-background/50"
                    placeholder="Link label"
                  />
                  <Button
                    className="rounded-md"
                    onClick={() => addEdge(newEdgeFrom, newEdgeTo, newEdgeLabel)}
                    disabled={!newEdgeFrom || !newEdgeTo}
                  >
                    <GitBranchPlus data-icon="inline-start" />
                    Add link
                  </Button>
                  <Separator className="bg-border/70" />
                  <div className="space-y-2">
                    {edgeItems.length ? (
                      edgeItems.map((edge) => (
                        <div key={edge.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {edge.fromTitle} <span className="text-muted-foreground">→</span> {edge.toTitle}
                            </div>
                            <div className="text-xs text-muted-foreground">{edge.label ?? 'next'}</div>
                          </div>
                          <Button variant="ghost" size="icon-sm" className="rounded-md" onClick={() => removeEdge(edge.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                        No links yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <SectionHeader title="Board summary" description="What the client will understand at a glance." />
                </CardHeader>
                <CardContent className="space-y-3 px-4 py-4">
                  <SummaryRow label="Board type" value={board.metadata?.isTemplate ? 'Template' : 'Live board'} />
                  <SummaryRow label="Phases" value={`${allPhases.length}`} />
                  <SummaryRow label="Steps" value={`${board.nodes.length}`} />
                  <SummaryRow label="Links" value={`${board.edges.length}`} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_320px]">
            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <SectionHeader title="Mermaid preview" description="Rendered board for client review, export, and handoff." />
                <CardAction className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" className="rounded-md" onClick={copyMermaidSource}>
                    <Copy data-icon="inline-start" />
                    Copy source
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-md" onClick={exportSvg}>
                    <Download data-icon="inline-start" />
                    SVG
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-md" onClick={exportPng}>
                    <Download data-icon="inline-start" />
                    PNG
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <div className="rounded-lg border border-border/80 bg-[#0f1113] p-4">
                  <MermaidPreview chart={mermaidChart} onRender={setRenderedSvg} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <SectionHeader title="Phase summary" description="Step narrative broken out by client-facing phase." />
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                {phaseColumns.map(({ phase, nodes }) => (
                  <div key={phase} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{phase}</div>
                      <Badge tone="muted">{nodes.length}</Badge>
                    </div>
                    {nodes.length ? (
                      nodes.map((node) => (
                        <div key={node.id} className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                          <div className="text-sm font-medium text-foreground">{node.title}</div>
                          <div className="mt-1 text-xs leading-5 text-muted-foreground">{node.body}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-4 text-xs text-muted-foreground">
                        No steps assigned.
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <SectionHeader title="Share board" description="Use the public board view when clients need a clean workflow walkthrough." />
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                {board.id ? (
                  <>
                    <div className="grid gap-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public share link</label>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Input readOnly value={shareUrl} className="rounded-md border-border/80 bg-background/50" />
                        <Button className="rounded-md" onClick={copyShareUrl}>
                          <Share2 data-icon="inline-start" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/80 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                      The share page presents the workflow in a simplified client view with a clean Mermaid render, phase breakdown, and step inventory.
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                    Save this board first to generate a public share link.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <SectionHeader title="Share readiness" description="Quick check before sending this to a client." />
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                <SummaryRow label="Board saved" value={board.id ? 'Yes' : 'No'} />
                <SummaryRow label="Description" value={board.description ? 'Complete' : 'Missing'} />
                <SummaryRow label="Phases used" value={`${phaseColumns.filter((phase) => phase.nodes.length).length}/${phaseColumns.length}`} />
                <SummaryRow label="Client-safe title" value={board.metadata?.sharedLabel ?? board.title} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedNode)} onOpenChange={(open) => (!open ? setSelectedNodeId(null) : undefined)}>
        <SheetContent side="right" className="w-full border-border/80 bg-background text-foreground sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Step editor</SheetTitle>
            <SheetDescription>Refine the selected workflow step, decision, or handoff.</SheetDescription>
          </SheetHeader>

          {selectedNode ? (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step title</label>
                <Input
                  value={selectedNode.title}
                  onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })}
                  className="rounded-md border-border/80 bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step description</label>
                <Textarea
                  value={selectedNode.body}
                  onChange={(event) => updateNode(selectedNode.id, { body: event.target.value })}
                  className="min-h-28 rounded-md border-border/80 bg-background/50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phase</label>
                  <Select value={selectedNode.phase ?? allPhases[0]} onValueChange={(value) => updateNode(selectedNode.id, { phase: value })}>
                    <SelectTrigger className="w-full rounded-md border-border/80 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPhases.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Node type</label>
                  <Select value={selectedNode.kind ?? 'step'} onValueChange={(value) => updateNode(selectedNode.id, { kind: value as WorkflowNode['kind'] })}>
                    <SelectTrigger className="w-full rounded-md border-border/80 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_NODE_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tone</label>
                <Select value={selectedNode.tone ?? 'metal'} onValueChange={(value) => updateNode(selectedNode.id, { tone: value as WorkflowNode['tone'] })}>
                  <SelectTrigger className="w-full rounded-md border-border/80 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metal">metal</SelectItem>
                    <SelectItem value="mint">mint</SelectItem>
                    <SelectItem value="amber">amber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/70" />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-md border-border/80 bg-transparent" onClick={() => duplicateNode(selectedNode.id)}>
                    Duplicate
                  </Button>
                  <Button variant="outline" className="rounded-md border-border/80 bg-transparent" onClick={() => setLinkSourceId(selectedNode.id)}>
                    Link from this step
                  </Button>
                </div>
                <Button variant="destructive" className="rounded-md" onClick={() => removeNode(selectedNode.id)}>
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="max-w-[60%] text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
