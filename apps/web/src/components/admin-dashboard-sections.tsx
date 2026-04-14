import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRight,
  Bot,
  Building2,
  PhoneCall,
  Send,
} from 'lucide-react';

import { OrganizationLoadChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/format';
import type { DemoBlueprintSummary, MetricCard, OrganizationSummary, RecentCall } from '@/lib/types';

const metricIcons = [Building2, Bot, PhoneCall, Send] as const;

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
          className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-3"
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

export function AdminControlDeckSection({
  metrics,
  organizations,
  recentCalls,
}: {
  metrics: MetricCard[];
  organizations: OrganizationSummary[];
  recentCalls: RecentCall[];
}) {
  const activeCall = recentCalls[0];
  const activeOrganizations = organizations.filter((organization) => organization.isActive).length;
  const liveAgents = organizations.reduce((sum, organization) => sum + organization.liveAgentCount, 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
        <CardHeader className="gap-3 border-b border-border/70 pb-5">
          <div className="space-y-2">
            <SectionEyebrow>Platform pulse</SectionEyebrow>
            <CardTitle className="text-3xl tracking-[-0.05em]">Admin command view</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              Executive visibility into organization load, live call traffic, and assistant footprint across the platform.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Badge tone="success">Live</Badge>
            <Badge tone="cyan">{activeOrganizations} active orgs</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5 px-5 py-5">
          <div className="rounded-lg border border-border/70 bg-background/60 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                voice current / live transcript / conversion flow
              </div>
              <div className="text-xs text-muted-foreground">
                Latest org: {activeCall ? activeCall.organizationName : 'Waiting for traffic'}
              </div>
            </div>
            <PulseAreaChart recentCalls={recentCalls} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active orgs</div>
              <div className="mt-2 text-base font-medium text-foreground">{activeOrganizations}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Live agents</div>
              <div className="mt-2 text-base font-medium text-foreground">{liveAgents}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recent calls</div>
              <div className="mt-2 text-base font-medium text-foreground">{recentCalls.length}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Campaigns</div>
              <div className="mt-2 text-base font-medium text-foreground">{metrics[3]?.value ?? '0'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <SectionEyebrow>Live queue</SectionEyebrow>
            <CardTitle>Calls in review</CardTitle>
            <CardDescription>Newest traffic requiring platform-level visibility.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <StackList
              items={recentCalls.slice(0, 3).map((call) => ({
                title: call.organizationName,
                detail: `${call.direction} • ${call.duration} • ${call.createdAt}`,
                badge: { label: call.outcome, tone: 'muted' },
              }))}
            />
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <SectionEyebrow>Watch list</SectionEyebrow>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Organizations with current live footprint on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <StackList
              items={organizations.slice(0, 4).map((organization) => ({
                title: organization.name,
                detail: `${organization.liveAgentCount} live agents • ${organization.memberCount} members`,
                badge: { label: organization.isActive ? 'Active' : 'Inactive', tone: organization.isActive ? 'success' : 'muted' },
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function AdminMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? Bot;

        return (
          <Card key={metric.label} className="border border-border/80 bg-card/80 py-0 shadow-none">
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
      })}
    </section>
  );
}

export function OrganizationRosterSection({
  organizations,
  limit,
  actionHref,
  actionLabel,
}: {
  organizations: OrganizationSummary[];
  limit?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = typeof limit === 'number' ? organizations.slice(0, limit) : organizations;

  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Organizations</SectionEyebrow>
        <CardTitle>Account roster</CardTitle>
        <CardDescription>Commercial mode, capacity, and last-touch state across all customers.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-0 py-0">
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 bg-muted/15">
                <TableHead className="px-4">Account</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Vapi</TableHead>
                <TableHead>Last call</TableHead>
                <TableHead className="px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((organization) => (
                  <TableRow key={organization.id} className="border-border/70">
                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{organization.name}</div>
                        <div className="text-xs text-muted-foreground">{organization.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>{organization.planName ?? 'Managed'}</TableCell>
                    <TableCell>{organization.memberCount}</TableCell>
                    <TableCell>
                      {organization.liveAgentCount}/{organization.agentCount}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {organization.vapiAccountMode === 'byo' ? 'BYO' : 'Managed'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {organization.vapiAccountMode === 'byo'
                            ? 'Customer-owned key'
                            : organization.vapiManagedLabel ?? 'BishopTech'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{organization.lastCallAt ? formatRelativeTime(organization.lastCallAt) : 'No calls'}</TableCell>
                    <TableCell className="px-4">
                      <Badge tone={organization.isActive ? 'success' : 'muted'}>
                        {organization.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8">
                    <EmptyState>No organizations provisioned yet.</EmptyState>
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

export function AdminRecentCallsSection({
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
        <CardDescription>Latest system-wide call traffic for operator review.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-4 py-4">
        {items.length ? (
          <StackList
            items={items.map((call) => ({
              title: call.organizationName,
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

export function AdminBlueprintHistorySection({
  recentBlueprints,
  limit,
  actionHref,
  actionLabel,
}: {
  recentBlueprints: DemoBlueprintSummary[];
  limit?: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = typeof limit === 'number' ? recentBlueprints.slice(0, limit) : recentBlueprints;

  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Demos</SectionEyebrow>
        <CardTitle>Blueprint history</CardTitle>
        <CardDescription>Recent demo flows and pre-sales assets generated by the platform.</CardDescription>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="px-4 py-4">
        {items.length ? (
          <StackList
            items={items.map((blueprint) => ({
              title: blueprint.title,
              detail: blueprint.websiteUrl ?? 'No source URL',
              badge: { label: blueprint.createdAt, tone: 'muted' },
            }))}
          />
        ) : (
          <EmptyState>No blueprints saved.</EmptyState>
        )}
      </CardContent>
    </Card>
  );
}

export function OrganizationLoadSection({
  organizations,
  limit,
}: {
  organizations: OrganizationSummary[];
  limit?: number;
}) {
  const items = typeof limit === 'number' ? organizations.slice(0, limit) : organizations;

  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <SectionEyebrow>Capacity</SectionEyebrow>
        <CardTitle>Agent load by account</CardTitle>
        <CardDescription>Relative live-assistant distribution across the current customer base.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <OrganizationLoadChart organizations={items} />
      </CardContent>
    </Card>
  );
}
