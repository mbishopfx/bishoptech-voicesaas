import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRight,
  AudioLines,
  Bot,
  ChartNoAxesCombined,
  PhoneCall,
  Send,
  Settings2,
} from 'lucide-react';

import { OutcomeBarChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import type { ClientDashboardData, DashboardAgent, LeadRecord, MetricCard, RecentCall } from '@/lib/types';

const metricIcons = [ChartNoAxesCombined, Bot, PhoneCall, Send] as const;

type ActionProps = {
  href?: string;
  label?: string;
};

function SectionEyebrow({ children }: { children: string }) {
  return (
    <span className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function SectionAction({ href, label }: ActionProps) {
  if (!href || !label) {
    return null;
  }

  return (
    <CardAction>
      <Button asChild variant="ghost" size="sm" className="rounded-md text-muted-foreground hover:text-foreground">
        <Link href={href as Route}>
          {label}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </CardAction>
  );
}

function toneToBadge(tone?: MetricCard['tone']) {
  if (tone === 'positive') {
    return 'success';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  return 'muted';
}

function MetricStack({ metrics }: { metrics: MetricCard[] }) {
  return metrics.map((metric, index) => {
    const Icon = metricIcons[index] ?? AudioLines;

    return (
      <Card
        key={metric.label}
        className="border border-border/80 bg-card/80 py-0 shadow-none"
      >
        <CardContent className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-md border border-border/70 bg-background/80">
                <Icon className="size-4" />
              </span>
              <span className="text-xs uppercase tracking-[0.18em]">{metric.label}</span>
            </div>
            <div className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{metric.value}</div>
          </div>
          <Badge tone={toneToBadge(metric.tone)}>{metric.delta}</Badge>
        </CardContent>
      </Card>
    );
  });
}

function StackList({
  items,
}: {
  items: Array<{
    title: string;
    detail: string;
    badge?: { label: string; tone?: 'default' | 'success' | 'warning' | 'muted' | 'cyan' };
  }>;
}) {
  if (!items.length) {
    return <EmptyState>Nothing to show yet.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="flex items-start justify-between gap-3 border border-border/80 bg-muted/20 px-3 py-3"
        >
          <div className="min-w-0 space-y-1">
            <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
            <div className="text-xs leading-5 text-muted-foreground">{item.detail}</div>
          </div>
          {item.badge ? <Badge tone={item.badge.tone ?? 'muted'}>{item.badge.label}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

export function ClientMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{MetricStack({ metrics })}</section>;
}

export function ClientControlDeckSection({
  data,
}: {
  data: ClientDashboardData;
}) {
  const activeCall = data.recentCalls[0];
  const primaryAgent = data.agents[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
        <CardHeader className="gap-3 border-b border-border/70 pb-5">
          <div className="space-y-2">
            <SectionEyebrow>Workspace pulse</SectionEyebrow>
            <CardTitle className="text-3xl tracking-[-0.05em]">{data.organizationName}</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              Live operations snapshot for agent readiness, call handling, campaign pressure, and account health.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Badge tone="cyan">{data.planName ?? 'Managed'}</Badge>
            <Badge tone={data.vapiAccountMode === 'byo' ? 'warning' : 'success'}>
              {data.vapiAccountMode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5 px-5 py-5">
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                sessions / response quality / transcript depth
              </div>
              <div className="text-xs text-muted-foreground">Primary agent: {primaryAgent?.name ?? 'Pending'}</div>
            </div>
            <PulseAreaChart recentCalls={data.recentCalls} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lead agent</div>
              <div className="mt-2 text-base font-medium text-foreground">{primaryAgent?.name ?? 'Pending'}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest outcome</div>
              <div className="mt-2 text-base font-medium text-foreground">{activeCall?.outcome ?? 'Standby'}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Phone numbers</div>
              <div className="mt-2 text-base font-medium text-foreground">{data.phoneNumbers.length}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Timezone</div>
              <div className="mt-2 text-base font-medium text-foreground">{data.timezone}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <SectionEyebrow>Assistants</SectionEyebrow>
            <CardTitle>Live stack</CardTitle>
            <CardDescription>Current assistant footprint and ownership.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <StackList
              items={data.agents.slice(0, 4).map((agent) => ({
                title: agent.name,
                detail: `${agent.role} • ${agent.voice} • ${agent.model}`,
                badge: {
                  label: agent.syncStatus ?? 'unknown',
                  tone:
                    agent.syncStatus === 'synced'
                      ? 'success'
                      : agent.syncStatus === 'error'
                        ? 'warning'
                        : 'muted',
                },
              }))}
            />
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <SectionEyebrow>Recent queue</SectionEyebrow>
            <CardTitle>Calls</CardTitle>
            <CardDescription>Most recent interaction outcomes across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <StackList
              items={data.recentCalls.slice(0, 4).map((call) => ({
                title: call.caller,
                detail: `${call.direction} • ${call.duration} • ${call.createdAt}`,
                badge: { label: call.outcome, tone: 'muted' },
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function ClientAgentsSection({
  agents,
  limit,
  actionHref,
  actionLabel,
}: {
  agents: DashboardAgent[];
  organizationName: string;
  limit?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = typeof limit === 'number' ? agents.slice(0, limit) : agents;

  return (
    <Card className="py-0">
      <CardHeader className="border-b pb-4">
        <SectionEyebrow>Agents</SectionEyebrow>
        <CardTitle>Assistant stack</CardTitle>
        <CardDescription>Versioned assistants, sync state, and publish control in one table-first surface.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-0 py-0">
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Voice</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.lastSyncedAt}</div>
                      </div>
                    </TableCell>
                    <TableCell>{agent.role}</TableCell>
                    <TableCell>{agent.voice}</TableCell>
                    <TableCell>{agent.model}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={agent.status === 'live' ? 'success' : 'muted'}>{agent.status}</Badge>
                        <Badge
                          tone={
                            agent.syncStatus === 'synced'
                              ? 'success'
                              : agent.syncStatus === 'error'
                                ? 'warning'
                                : 'muted'
                          }
                        >
                          {agent.syncStatus ?? 'unknown'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/client/agents/${agent.id}` as Route}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-8">
                    <EmptyState>No agents assigned.</EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </CardContent>
    </Card>
  );
}

export function ClientWorkspaceSummarySection({
  data,
  showSettingsLink = true,
}: {
  data: ClientDashboardData;
  showSettingsLink?: boolean;
}) {
  const workspaceRows = [
    { label: 'Plan', value: data.planName ?? 'Managed' },
    {
      label: 'Vapi ownership',
      value:
        data.vapiAccountMode === 'byo'
          ? `BYO • ${data.vapiApiKeyLabel ?? 'Key connected'}`
          : data.vapiManagedLabel ?? 'Managed by BishopTech',
    },
    { label: 'Numbers', value: `${data.phoneNumbers.length}` },
    { label: 'Blueprints', value: `${data.recentBlueprints.length}` },
    { label: 'Timezone', value: data.timezone },
  ];

  return (
    <Card className="py-0">
      <CardHeader className="border-b pb-4">
        <SectionEyebrow>Workspace</SectionEyebrow>
        <CardTitle>Environment</CardTitle>
        <CardDescription>Commercial mode, credentials, and operating context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y">
          {workspaceRows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="text-sm text-muted-foreground">{row.label}</div>
              <div className="max-w-[65%] text-right text-sm font-medium text-foreground">{row.value}</div>
            </div>
          ))}
        </div>
        {showSettingsLink ? (
          <Button asChild variant="outline" size="sm" className="w-full justify-between border-border/80 bg-transparent">
            <Link href="/client/settings">
              Workspace settings
              <Settings2 data-icon="inline-end" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ClientRecentCallsSection({
  recentCalls,
  limit,
  actionHref,
  actionLabel,
}: {
  recentCalls: RecentCall[];
  limit?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = typeof limit === 'number' ? recentCalls.slice(0, limit) : recentCalls;

  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Calls</SectionEyebrow>
        <CardTitle>Recent traffic</CardTitle>
        <CardDescription>Latest inbound and outbound interactions.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-4 py-4">
        {items.length ? (
          <StackList
            items={items.map((call) => ({
              title: call.caller,
              detail: `${call.direction} • ${call.createdAt}`,
              badge: { label: call.outcome, tone: 'muted' },
            }))}
          />
        ) : (
          <EmptyState>No calls logged.</EmptyState>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientLeadsSection({ leads }: { leads: LeadRecord[] }) {
  return (
    <Card className="py-0">
      <CardHeader className="border-b pb-4">
        <SectionEyebrow>Leads</SectionEyebrow>
        <CardTitle>Recovered and enriched lead records</CardTitle>
        <CardDescription>Every captured lead with transcript proof, recovery state, and next action.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Lead</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Recovery</TableHead>
                <TableHead>Enrichment</TableHead>
                <TableHead>Next action</TableHead>
                <TableHead className="px-4">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length ? (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{lead.name}</div>
                        <div className="max-w-md text-xs leading-5 text-muted-foreground">{lead.transcriptExcerpt}</div>
                      </div>
                    </TableCell>
                    <TableCell>{lead.service}</TableCell>
                    <TableCell>
                      <Badge tone={lead.recoveryStatus === 'recovered' ? 'success' : lead.recoveryStatus === 'needs-review' ? 'warning' : 'muted'}>
                        {lead.recoveryStatus ?? 'structured'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={lead.enrichmentStatus === 'completed' ? 'success' : lead.enrichmentStatus === 'failed' ? 'warning' : 'muted'}>
                        {lead.enrichmentStatus ?? 'not run'}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.nextAction ?? lead.urgency}</TableCell>
                    <TableCell className="px-4">{lead.createdAt}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-8">
                    <EmptyState>No leads captured.</EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </CardContent>
    </Card>
  );
}

export function ClientCallLogSection({ recentCalls }: { recentCalls: RecentCall[] }) {
  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Call log</SectionEyebrow>
        <CardTitle>Recordings</CardTitle>
        <CardDescription>Recent calls with transcript summaries and recording access.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 bg-muted/15">
                <TableHead className="px-4">Caller</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="px-4">Asset</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCalls.length ? (
                recentCalls.map((call) => (
                  <TableRow key={call.id} className="border-border/70">
                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{call.caller}</div>
                        <div className="max-w-md text-xs leading-5 text-muted-foreground">{call.summary}</div>
                      </div>
                    </TableCell>
                    <TableCell>{call.outcome}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell className="px-4">
                      {call.recordingUrl ? (
                        <Button asChild variant="ghost" size="sm" className="rounded-md px-0 text-foreground">
                          <a href={call.recordingUrl} target="_blank" rel="noreferrer">
                            {call.recordingLabel ?? 'Recording'}
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">No asset</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-8">
                    <EmptyState>No calls recorded.</EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </CardContent>
    </Card>
  );
}

export function ClientOutcomeChartSection({ recentCalls }: { recentCalls: RecentCall[] }) {
  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Outcomes</SectionEyebrow>
        <CardTitle>Result distribution</CardTitle>
        <CardDescription>How call outcomes are trending across the current reporting window.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <OutcomeBarChart recentCalls={recentCalls} />
      </CardContent>
    </Card>
  );
}

export function ClientCampaignsSection({
  campaigns,
  limit,
  actionHref,
  actionLabel,
}: {
  campaigns: ClientDashboardData['campaigns'];
  limit?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = typeof limit === 'number' ? campaigns.slice(0, limit) : campaigns;

  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Campaigns</SectionEyebrow>
        <CardTitle>Outbound queue</CardTitle>
        <CardDescription>Sequenced outbound activity and campaign state.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-4 py-4">
        {items.length ? (
          <StackList
            items={items.map((campaign) => ({
              title: campaign.name,
              detail: campaign.createdAt,
              badge: { label: campaign.status, tone: 'muted' },
            }))}
          />
        ) : (
          <EmptyState>No campaigns launched.</EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
