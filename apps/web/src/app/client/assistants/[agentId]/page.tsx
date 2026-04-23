import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, MessageSquarePlus } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { CallCommandCenter } from '@/components/call-command-center';
import { ClientWorkspaceSummarySection } from '@/components/client-dashboard-sections';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireViewer } from '@/lib/auth';
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
          <Card className="py-0">
            <CardHeader className="border-b pb-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={detail.agent.status === 'live' ? 'success' : detail.agent.status === 'ready' ? 'cyan' : 'muted'}>
                    {detail.agent.status === 'live' ? 'Live' : detail.agent.status === 'ready' ? 'Ready' : 'In setup'}
                  </Badge>
                  <Badge tone="muted">{detail.agent.role}</Badge>
                </div>
                <CardTitle className="text-2xl tracking-[-0.04em]">{detail.agent.name}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  {detail.agent.purpose}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-4 py-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Voice</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{detail.agent.voice}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Phone lines</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{detail.stats.phoneNumbers.length}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recent calls</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{detail.stats.totalCalls}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last updated</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{detail.agent.lastSyncedAt}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
                <div className="rounded-[24px] border border-border/75 bg-background/72 px-4 py-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">How to use this page</p>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>Use this page to review how this assistant is performing and to inspect recent calls connected to it.</p>
                    <p>If you want tone, routing, or content updates, send a support request instead of editing the assistant directly.</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Button asChild variant="outline" className="h-11 justify-between rounded-[18px] px-4">
                    <Link href="/client/tickets">
                      Request an update
                      <MessageSquarePlus data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 justify-between rounded-[18px] px-4">
                    <Link href="/help">
                      Open playbooks
                      <BookOpen data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <aside className="flex flex-col gap-6">
            <Card className="py-0">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">Performance</CardTitle>
                <CardDescription>Recent call and conversion totals for this assistant.</CardDescription>
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
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Average call length</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {Math.max(1, Math.round(detail.stats.averageDurationSeconds / 60))}m
                  </div>
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
                <CardTitle className="text-base">Coverage</CardTitle>
                <CardDescription>Resources and follow-up signals attached to this assistant.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 py-4">
                <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Knowledge status</div>
                  <div className="mt-2 break-all text-sm font-medium">
                    {detail.agent.kbSyncStatus === 'synced' ? 'Knowledge updated' : 'Knowledge review pending'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={detail.agent.kbSyncStatus === 'synced' ? 'success' : 'warning'}>
                    {detail.agent.kbSyncStatus === 'synced' ? 'Updated' : 'Review needed'}
                  </Badge>
                  {detail.demoBlueprint?.uploadedAssets?.length ? (
                    <Badge tone="muted">{detail.demoBlueprint.uploadedAssets.length} resources</Badge>
                  ) : null}
                </div>
                {detail.demoBlueprint?.uploadedAssets?.length ? (
                  <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Attached resources</div>
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      {detail.demoBlueprint.uploadedAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between gap-3">
                          <span className="truncate">{asset.sourceLabel}</span>
                          <Badge tone={asset.syncStatus === 'synced' ? 'success' : 'muted'}>
                            {asset.syncStatus === 'synced' ? 'Ready' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="text-sm text-muted-foreground">
                  Last reviewed call: {detail.agent.lastTestCallAt ?? 'Not recorded yet'}
                </div>
              </CardContent>
            </Card>
            <ClientWorkspaceSummarySection data={workspace} />
          </aside>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b pb-4">
            <CardTitle>Requests tied to this assistant</CardTitle>
            <CardDescription>Questions and updates already submitted for this assistant.</CardDescription>
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
