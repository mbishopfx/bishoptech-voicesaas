import Link from 'next/link';
import type { Route } from 'next';
import { Activity, AudioLines, Bot, Building2, PhoneCall, Send } from 'lucide-react';

import { OrganizationLoadChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/format';
import type { DemoBlueprintSummary, MetricCard, OrganizationSummary, RecentCall } from '@/lib/types';

const metricIcons = [Building2, Bot, PhoneCall, Send] as const;

type ActionProps = {
  href?: string;
  label?: string;
};

function SectionAction({ href, label }: ActionProps) {
  if (!href || !label) {
    return null;
  }

  return (
    <Link className="text-link" href={href as Route}>
      {label}
    </Link>
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
    <section className="dashboard-window-grid">
      <Card className="dashboard-primary-panel">
        <CardHeader className="dashboard-panel-header">
          <div>
            <span className="eyebrow-text">Platform pulse</span>
            <CardTitle className="dashboard-panel-title">Admin command view</CardTitle>
          </div>
          <Badge tone="success">Live</Badge>
        </CardHeader>

        <CardContent className="dashboard-primary-content">
          <div className="dashboard-chart-block">
            <div className="dashboard-chart-kicker">voice_current // live_transcript // conversion_flow</div>
            <PulseAreaChart recentCalls={recentCalls} />
            <div className="dashboard-inline-stats">
              <div className="dashboard-inline-stat">
                <span>Latest call</span>
                <strong>{activeCall ? activeCall.organizationName : 'Waiting for traffic'}</strong>
              </div>
              <div className="dashboard-inline-stat">
                <span>Status</span>
                <strong>{activeCall?.outcome ?? 'Standby'}</strong>
              </div>
              <div className="dashboard-inline-stat">
                <span>Duration</span>
                <strong>{activeCall?.duration ?? '00:00'}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-kpi-row">
            <div className="dashboard-kpi-box">
              <span>Active orgs</span>
              <strong>{activeOrganizations}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Live agents</span>
              <strong>{liveAgents}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Recent calls</span>
              <strong>{recentCalls.length}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Campaigns</span>
              <strong>{metrics[3]?.value ?? '0'}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="dashboard-side-column">
        <Card className="dashboard-side-panel">
          <CardHeader className="dashboard-panel-header">
            <div>
              <span className="eyebrow-text">Live queue</span>
              <CardTitle className="dashboard-side-title">Calls in review</CardTitle>
            </div>
            <AudioLines size={15} />
          </CardHeader>
          <CardContent className="dashboard-side-list">
            {recentCalls.slice(0, 3).map((call) => (
              <div key={call.id} className="dashboard-side-row">
                <strong>{call.organizationName}</strong>
                <span>{call.outcome}</span>
              </div>
            ))}
            {!recentCalls.length ? <div className="ops-empty-state">No calls logged.</div> : null}
          </CardContent>
        </Card>

        <Card className="dashboard-side-panel">
          <CardHeader className="dashboard-panel-header">
            <div>
              <span className="eyebrow-text">Watch list</span>
              <CardTitle className="dashboard-side-title">Accounts</CardTitle>
            </div>
            <Activity size={15} />
          </CardHeader>
          <CardContent className="dashboard-side-list">
            {organizations.slice(0, 4).map((organization) => (
              <div key={organization.id} className="dashboard-side-row">
                <strong>{organization.name}</strong>
                <span>{organization.liveAgentCount} agents</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function AdminMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section className="dashboard-stat-grid">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? Bot;

        return (
          <Card key={metric.label} className="dashboard-stat-card">
            <CardContent className="dashboard-stat-content">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon">
                  <Icon size={16} />
                </span>
                <Badge tone={metric.tone === 'positive' ? 'success' : metric.tone === 'warning' ? 'warning' : 'muted'}>
                  {metric.delta}
                </Badge>
              </div>
              <span className="dashboard-stat-label">{metric.label}</span>
              <strong className="dashboard-stat-value">{metric.value}</strong>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Organizations</span>
          <CardTitle className="dashboard-side-title">Account roster</CardTitle>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent>
        <TableWrap>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Account</TableHeader>
                <TableHeader>Plan</TableHeader>
                <TableHeader>Members</TableHeader>
                <TableHeader>Agents</TableHeader>
                <TableHeader>Vapi</TableHeader>
                <TableHeader>Last call</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length ? (
                items.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <div className="dashboard-table-primary">
                        <strong>{organization.name}</strong>
                        <span>{organization.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>{organization.planName ?? 'Managed'}</TableCell>
                    <TableCell>{organization.memberCount}</TableCell>
                    <TableCell>
                      {organization.liveAgentCount}/{organization.agentCount}
                    </TableCell>
                    <TableCell>
                      <div className="dashboard-table-primary">
                        <strong>{organization.vapiAccountMode === 'byo' ? 'BYO' : 'Managed'}</strong>
                        <span>{organization.vapiAccountMode === 'byo' ? 'Customer-owned key' : organization.vapiManagedLabel ?? 'BishopTech'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{organization.lastCallAt ? formatRelativeTime(organization.lastCallAt) : 'No calls'}</TableCell>
                    <TableCell>
                      <Badge tone={organization.isActive ? 'success' : 'muted'}>{organization.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>No organizations provisioned yet.</TableCell>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Calls</span>
          <CardTitle className="dashboard-side-title">Recent traffic</CardTitle>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="dashboard-side-list">
        {items.length ? (
          items.map((call) => (
            <div key={call.id} className="dashboard-feed-row">
              <div>
                <strong>{call.organizationName}</strong>
                <span>
                  {call.direction} • {call.createdAt}
                </span>
              </div>
              <Badge tone="muted">{call.outcome}</Badge>
            </div>
          ))
        ) : (
          <div className="ops-empty-state">No calls logged.</div>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Demos</span>
          <CardTitle className="dashboard-side-title">Blueprint history</CardTitle>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="dashboard-side-list">
        {items.length ? (
          items.map((blueprint) => (
            <div key={blueprint.id} className="dashboard-feed-row">
              <div>
                <strong>{blueprint.title}</strong>
                <span>{blueprint.websiteUrl ?? 'No source URL'}</span>
              </div>
              <Badge tone="muted">{blueprint.createdAt}</Badge>
            </div>
          ))
        ) : (
          <div className="ops-empty-state">No blueprints saved.</div>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Capacity</span>
          <CardTitle className="dashboard-side-title">Agent load by account</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <OrganizationLoadChart organizations={items} />
      </CardContent>
    </Card>
  );
}
