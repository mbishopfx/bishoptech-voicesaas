import Link from 'next/link';
import type { Route } from 'next';
import { AudioLines, Bot, ChartNoAxesCombined, PhoneCall, Send } from 'lucide-react';

import { OutcomeBarChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import type { ClientDashboardData, DashboardAgent, LeadRecord, MetricCard, RecentCall } from '@/lib/types';

const metricIcons = [ChartNoAxesCombined, Bot, PhoneCall, Send] as const;

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

export function ClientMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section className="dashboard-stat-grid">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? AudioLines;

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

export function ClientControlDeckSection({
  data,
}: {
  data: ClientDashboardData;
}) {
  const activeCall = data.recentCalls[0];
  const primaryAgent = data.agents[0];

  return (
    <section className="dashboard-window-grid">
      <Card className="dashboard-primary-panel">
        <CardHeader className="dashboard-panel-header">
          <div>
            <span className="eyebrow-text">Workspace pulse</span>
            <CardTitle className="dashboard-panel-title">{data.organizationName}</CardTitle>
          </div>
          <Badge tone="cyan">{data.planName ?? 'Managed'}</Badge>
        </CardHeader>

        <CardContent className="dashboard-primary-content">
          <div className="dashboard-chart-block">
            <div className="dashboard-chart-kicker">sessions // response quality // transcript depth</div>
            <PulseAreaChart recentCalls={data.recentCalls} />
            <div className="dashboard-inline-stats">
              <div className="dashboard-inline-stat">
                <span>Lead agent</span>
                <strong>{primaryAgent?.name ?? 'Pending'}</strong>
              </div>
              <div className="dashboard-inline-stat">
                <span>Latest outcome</span>
                <strong>{activeCall?.outcome ?? 'Standby'}</strong>
              </div>
              <div className="dashboard-inline-stat">
                <span>Numbers</span>
                <strong>{data.phoneNumbers.length}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-kpi-row">
            <div className="dashboard-kpi-box">
              <span>Agents</span>
              <strong>{data.agents.length}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Calls</span>
              <strong>{data.recentCalls.length}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Campaigns</span>
              <strong>{data.campaigns.length}</strong>
            </div>
            <div className="dashboard-kpi-box">
              <span>Timezone</span>
              <strong>{data.timezone}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="dashboard-side-column">
        <Card className="dashboard-side-panel">
          <CardHeader className="dashboard-panel-header">
            <div>
              <span className="eyebrow-text">Assistants</span>
              <CardTitle className="dashboard-side-title">Live stack</CardTitle>
            </div>
            <Bot size={15} />
          </CardHeader>
          <CardContent className="dashboard-side-list">
            {data.agents.slice(0, 4).map((agent) => (
              <div key={agent.id} className="dashboard-side-row">
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
            ))}
            {!data.agents.length ? <div className="ops-empty-state">No agents assigned.</div> : null}
          </CardContent>
        </Card>

        <Card className="dashboard-side-panel">
          <CardHeader className="dashboard-panel-header">
            <div>
              <span className="eyebrow-text">Recent queue</span>
              <CardTitle className="dashboard-side-title">Calls</CardTitle>
            </div>
            <AudioLines size={15} />
          </CardHeader>
          <CardContent className="dashboard-side-list">
            {data.recentCalls.slice(0, 4).map((call) => (
              <div key={call.id} className="dashboard-side-row">
                <strong>{call.caller}</strong>
                <span>{call.outcome}</span>
              </div>
            ))}
            {!data.recentCalls.length ? <div className="ops-empty-state">No calls logged.</div> : null}
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Agents</span>
          <CardTitle className="dashboard-side-title">Assistant stack</CardTitle>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent>
        <TableWrap>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Voice</TableHeader>
                <TableHeader>Model</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length ? (
                items.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="dashboard-table-primary">
                        <strong>{agent.name}</strong>
                        <span>{agent.lastSyncedAt}</span>
                      </div>
                    </TableCell>
                    <TableCell>{agent.role}</TableCell>
                    <TableCell>{agent.voice}</TableCell>
                    <TableCell>{agent.model}</TableCell>
                    <TableCell>
                      <Badge tone={agent.status === 'live' ? 'success' : 'muted'}>{agent.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>No agents assigned.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </CardContent>
    </Card>
  );
}

export function ClientWorkspaceSummarySection({ data }: { data: ClientDashboardData }) {
  return (
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Workspace</span>
          <CardTitle className="dashboard-side-title">Environment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="dashboard-side-list">
        <div className="dashboard-side-row">
          <strong>Plan</strong>
          <span>{data.planName ?? 'Managed'}</span>
        </div>
        <div className="dashboard-side-row">
          <strong>Numbers</strong>
          <span>{data.phoneNumbers.length}</span>
        </div>
        <div className="dashboard-side-row">
          <strong>Blueprints</strong>
          <span>{data.recentBlueprints.length}</span>
        </div>
        <div className="dashboard-side-row">
          <strong>Timezone</strong>
          <span>{data.timezone}</span>
        </div>
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
                <strong>{call.caller}</strong>
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

export function ClientLeadsSection({ leads }: { leads: LeadRecord[] }) {
  return (
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Leads</span>
          <CardTitle className="dashboard-side-title">Captured contacts</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TableWrap>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Lead</TableHeader>
                <TableHeader>Intent</TableHeader>
                <TableHeader>Urgency</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.length ? (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="dashboard-table-primary">
                        <strong>{lead.name}</strong>
                        <span>{lead.transcriptExcerpt}</span>
                      </div>
                    </TableCell>
                    <TableCell>{lead.service}</TableCell>
                    <TableCell>{lead.urgency}</TableCell>
                    <TableCell>{lead.createdAt}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No leads captured.</TableCell>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Call log</span>
          <CardTitle className="dashboard-side-title">Recordings</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TableWrap>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Caller</TableHeader>
                <TableHeader>Outcome</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Asset</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentCalls.length ? (
                recentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div className="dashboard-table-primary">
                        <strong>{call.caller}</strong>
                        <span>{call.summary}</span>
                      </div>
                    </TableCell>
                    <TableCell>{call.outcome}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell>
                      {call.recordingUrl ? (
                        <a className="text-link" href={call.recordingUrl} target="_blank" rel="noreferrer">
                          {call.recordingLabel ?? 'Recording'}
                        </a>
                      ) : (
                        'No asset'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No calls recorded.</TableCell>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Outcomes</span>
          <CardTitle className="dashboard-side-title">Result distribution</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
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
    <Card className="dashboard-data-panel">
      <CardHeader className="dashboard-table-header">
        <div>
          <span className="eyebrow-text">Campaigns</span>
          <CardTitle className="dashboard-side-title">Outbound queue</CardTitle>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </CardHeader>
      <CardContent className="dashboard-side-list">
        {items.length ? (
          items.map((campaign) => (
            <div key={campaign.id} className="dashboard-feed-row">
              <div>
                <strong>{campaign.name}</strong>
                <span>{campaign.createdAt}</span>
              </div>
              <Badge tone="muted">{campaign.status}</Badge>
            </div>
          ))
        ) : (
          <div className="ops-empty-state">No campaigns launched.</div>
        )}
      </CardContent>
    </Card>
  );
}
