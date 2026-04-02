import { notFound } from 'next/navigation';

import { MermaidPreview } from '@/components/mermaid-preview';
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

  const mermaid = workflowBoardToMermaid(data.board.nodes, data.board.edges);

  return (
    <main className="workflow-share-shell">
      <section className="workflow-share-stage">
        <div className="workflow-share-head">
          <span className="eyebrow-text">Shared workflow map</span>
          <h1>{data.board.title}</h1>
          <p>{data.organizationName}</p>
        </div>

        <div className="workflow-share-map">
          <MermaidPreview chart={mermaid} />
        </div>
      </section>
    </main>
  );
}
