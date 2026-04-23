import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgentEditor } from '@/components/agent-editor';
import { AppShell } from '@/components/app-shell';
import { CallCommandCenter } from '@/components/call-command-center';
import { ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { canManageOrganization, requireViewer } from '@/lib/auth';
import { getClientDashboardData } from '@/lib/dashboard-data';
import { loadAssistantDetail } from '@/lib/voiceops-platform';

export const dynamic = 'force-dynamic';

type ClientAssistantPageProps = {
  params: Promise<{
    agentId: string;
  }>;
};

export default async function ClientAssistantPage({ params }: ClientAssistantPageProps) {
  const viewer = await requireViewer();
  const { agentId } = await params;
  const [workspace, detail] = await Promise.all([
    getClientDashboardData(viewer),
    loadAssistantDetail(agentId).catch(() => null),
  ]);

  if (!detail || detail.agent.organizationId !== workspace.organizationId) {
    notFound();
  }

  const canEdit = canManageOrganization(viewer, workspace.organizationId);

  return (
    <AppShell
      current="client"
      viewer={viewer}
      activeNav="assistants"
      headerMode="compact"
      eyebrow="Assistants"
      title={detail.agent.name}
      actions={
        <Button asChild variant="outline">
          <Link href="/client/assistants">Back to assistants</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <AgentEditor agent={detail.agent} organizationName={workspace.organizationName} canEdit={canEdit} />
          <aside className="flex flex-col gap-6">
            <Card className="py-0">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">Assistant stats</CardTitle>
                <CardDescription>Live sync state, cost, quality, and conversation volume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 py-4">
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Calls</div>
                  <div className="mt-2 text-2xl font-semibold">{detail.stats.totalCalls}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Booked</div>
                  <div className="mt-2 text-2xl font-semibold">{detail.stats.bookedCalls}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Won</div>
                  <div className="mt-2 text-2xl font-semibold">{detail.stats.wonCalls}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cost</div>
                  <div className="mt-2 text-2xl font-semibold">${detail.stats.totalCostUsd.toFixed(2)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.stats.phoneNumbers.map((phoneNumber) => (
                    <Badge key={phoneNumber} tone="muted">
                      {phoneNumber}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">Embeds and knowledge</CardTitle>
                <CardDescription>Read-only demo asset visibility for this assistant workspace.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 py-4">
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Assistant ID</div>
                  <div className="mt-2 break-all text-sm font-medium">{detail.agent.vapiAssistantId ?? 'Not published yet'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={detail.agent.kbSyncStatus === 'synced' ? 'success' : 'warning'}>
                    {detail.agent.kbSyncStatus ?? 'pending'}
                  </Badge>
                  {detail.agent.knowledgePackSlug ? <Badge tone="muted">{detail.agent.knowledgePackSlug}</Badge> : null}
                  {detail.agent.queryToolId ? <Badge tone="cyan">Query tool ready</Badge> : null}
                </div>
                {detail.demoBlueprint?.uploadedAssets?.length ? (
                  <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Knowledge assets</div>
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      {detail.demoBlueprint.uploadedAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between gap-3">
                          <span className="truncate">{asset.sourceLabel}</span>
                          <Badge tone={asset.syncStatus === 'synced' ? 'success' : 'muted'}>{asset.syncStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {detail.agent.embedSnippet ? (
                  <div className="rounded-md border border-border/70 bg-background px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Embed snippet</div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[0.72rem] leading-5 text-muted-foreground">
                      {detail.agent.embedSnippet}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No embed snippet is attached to this assistant yet.</div>
                )}
                <div className="text-sm text-muted-foreground">
                  Last test call: {detail.agent.lastTestCallAt ?? 'Not run yet'}
                </div>
              </CardContent>
            </Card>
            <ClientWorkspaceSummarySection data={workspace} />
          </aside>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b pb-4">
            <CardTitle>Revision tickets</CardTitle>
            <CardDescription>Protected changes and operator requests tied to this assistant.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 py-4">
            {detail.tickets.length ? (
              detail.tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-md border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{ticket.subject}</div>
                    <Badge tone="cyan">{ticket.ticketType}</Badge>
                    <Badge tone={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'warning'}>
                      {ticket.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{ticket.description}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No tickets are attached to this assistant yet.</div>
            )}
          </CardContent>
        </Card>

        <CallCommandCenter recentCalls={detail.calls} mode="client" />
      </div>
    </AppShell>
  );
}
