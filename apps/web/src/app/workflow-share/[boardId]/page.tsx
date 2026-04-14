import { notFound } from 'next/navigation';

import { MermaidPreview } from '@/components/mermaid-preview';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicWorkflowBoard } from '@/lib/dashboard-data';
import { workflowBoardToMermaid } from '@/lib/workflow';

export const dynamic = 'force-dynamic';

type WorkflowSharePageProps = {
  params: Promise<{
    boardId: string;
  }>;
};

export default async function WorkflowSharePage({ params }: WorkflowSharePageProps) {
  const { boardId } = await params;
  const data = await getPublicWorkflowBoard(boardId);

  if (!data) {
    notFound();
  }

  const phases = data.board.metadata?.phaseOrder?.length ? [...data.board.metadata.phaseOrder] : [];
  for (const node of data.board.nodes) {
    if (node.phase && !phases.includes(node.phase)) {
      phases.push(node.phase);
    }
  }
  const mermaid = workflowBoardToMermaid(data.board.nodes, data.board.edges, phases);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="border border-border/80 bg-card/90 py-0 shadow-none">
          <CardHeader className="gap-3 border-b border-border/70 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Shared workflow</Badge>
              <Badge tone="muted">{data.organizationName}</Badge>
              <Badge tone="muted">{data.board.nodes.length} steps</Badge>
              <Badge tone="muted">{data.board.edges.length} links</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-[-0.05em]">
                {data.board.metadata?.sharedLabel ?? data.board.title}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {data.board.description}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <Card className="border border-border/80 bg-card/90 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <CardTitle>Workflow map</CardTitle>
              <CardDescription>Visual sequence of the current workflow phases and step links.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <div className="rounded-lg border border-border/80 bg-[#0f1113] p-4">
                <MermaidPreview chart={mermaid} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border border-border/80 bg-card/90 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Phase summary</CardTitle>
                <CardDescription>Client-facing breakdown of how the flow progresses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                {phases.map((phase) => {
                  const nodes = data.board.nodes.filter((node) => node.phase === phase);

                  return (
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
                          No steps in this phase.
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
