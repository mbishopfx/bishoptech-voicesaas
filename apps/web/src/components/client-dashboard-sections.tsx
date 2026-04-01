import Link from 'next/link';
import type { Route } from 'next';
import { AudioLines, Bot, ChartNoAxesCombined, PhoneCall, Send } from 'lucide-react';

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
    <section className="metric-grid command-metric-grid">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? AudioLines;

        return (
          <article key={metric.label} className={`glass-card command-metric-card tone-${metric.tone ?? 'neutral'}`}>
            <div className="command-metric-head">
              <span className="command-metric-icon">
                <Icon size={18} />
              </span>
              <span className="command-metric-delta">{metric.delta}</span>
            </div>
            <p className="command-metric-label">{metric.label}</p>
            <strong className="command-metric-value">{metric.value}</strong>
          </article>
        );
      })}
    </section>
  );
}

export function ClientAgentsSection({
  agents,
  organizationName,
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
    <section className="command-section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Assistant stack</span>
          <h2>Live assistants</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <p>{organizationName} is currently scoped across inbound, outbound, and specialist voice roles.</p>

      <div className="command-agent-grid">
        {items.length ? (
          items.map((agent) => (
            <article key={agent.id} className="glass-card command-agent-card">
              <div className="command-agent-top">
                <div className={`command-agent-dot ${agent.status === 'live' ? 'is-live' : 'is-idle'}`} />
                <div>
                  <h3>{agent.name}</h3>
                  <p>{agent.role}</p>
                </div>
              </div>

              <div className="command-stat-strip">
                <div>
                  <span>Voice</span>
                  <strong>{agent.voice}</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>{agent.model}</strong>
                </div>
              </div>

              <p className="command-card-copy">{agent.purpose}</p>
              <span className="command-inline-note">Last synced {agent.lastSyncedAt}</span>
            </article>
          ))
        ) : (
          <div className="glass-card empty-state">
            <h4>No assistants have been assigned to this organization yet.</h4>
            <p>The workspace will populate after the onboarding stack is provisioned.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ClientWorkspaceSummarySection({ data }: { data: ClientDashboardData }) {
  return (
    <section className="command-section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Workspace summary</span>
          <h2>Account snapshot</h2>
        </div>
      </div>

      <div className="glass-card command-summary-card">
        <div className="command-summary-top">
          <div>
            <h3>{data.organizationName}</h3>
            <p>{data.planName ?? 'Managed workspace'}</p>
          </div>
          <span className="surface-pill">{data.timezone}</span>
        </div>

        <div className="command-stat-strip">
          <div>
            <span>Numbers</span>
            <strong>{data.phoneNumbers.length}</strong>
          </div>
          <div>
            <span>Campaigns</span>
            <strong>{data.campaigns.length}</strong>
          </div>
          <div>
            <span>Blueprints</span>
            <strong>{data.recentBlueprints.length}</strong>
          </div>
        </div>

        <div className="pill-row">
          {data.phoneNumbers.length ? (
            data.phoneNumbers.map((phoneNumber) => (
              <span key={phoneNumber} className="surface-pill">
                {phoneNumber}
              </span>
            ))
          ) : (
            <span className="surface-pill">No active number stored</span>
          )}
        </div>
      </div>
    </section>
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
    <section className="command-section-block command-feed-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Recent activity</span>
          <h2>Latest call events</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="command-activity-feed">
        {items.length ? (
          items.map((call) => (
            <article key={call.id} className="command-activity-item">
              <div className="command-activity-meta">
                <span>{call.direction}</span>
                <span>{call.createdAt}</span>
              </div>
              <strong>{call.caller}</strong>
              <p>{call.summary}</p>
              <div className="command-activity-footer">
                <span>{call.outcome}</span>
                <span>{call.duration}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-inline">No calls have been recorded yet.</div>
        )}
      </div>
    </section>
  );
}

export function ClientLeadsSection({ leads }: { leads: LeadRecord[] }) {
  return (
    <section className="section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Leads captured</span>
          <h2>Recent contact activity</h2>
        </div>
      </div>

      <div className="table-shell">
        <div className="table-header">
          <span>Lead</span>
          <span>Service</span>
          <span>Urgency</span>
          <span>Updated</span>
        </div>

        {leads.length ? (
          leads.map((lead) => (
            <div className="table-row" key={lead.id}>
              <div>
                <strong>{lead.name}</strong>
                <p>{lead.transcriptExcerpt}</p>
              </div>
              <div>{lead.service}</div>
              <div>{lead.urgency}</div>
              <div>{lead.createdAt}</div>
            </div>
          ))
        ) : (
          <div className="table-empty">No contact rows have been written yet.</div>
        )}
      </div>
    </section>
  );
}

export function ClientCallLogSection({ recentCalls }: { recentCalls: RecentCall[] }) {
  return (
    <section className="section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Call log</span>
          <h2>Calls and recordings</h2>
        </div>
      </div>

      <div className="table-shell">
        <div className="table-header">
          <span>Caller</span>
          <span>Outcome</span>
          <span>Duration</span>
          <span>Asset</span>
        </div>

        {recentCalls.length ? (
          recentCalls.map((call) => (
            <div className="table-row" key={call.id}>
              <div>
                <strong>{call.caller}</strong>
                <p>{call.summary}</p>
              </div>
              <div>{call.outcome}</div>
              <div>{call.duration}</div>
              <div>
                {call.recordingUrl ? (
                  <a className="text-link" href={call.recordingUrl} target="_blank" rel="noreferrer">
                    {call.recordingLabel ?? 'Download audio'}
                  </a>
                ) : (
                  call.recordingLabel ?? 'No downloadable asset linked yet'
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="table-empty">No calls have been recorded yet.</div>
        )}
      </div>
    </section>
  );
}

export function ClientOutcomeChartSection({ recentCalls }: { recentCalls: RecentCall[] }) {
  const outcomeGroups = Array.from(
    recentCalls.reduce<Map<string, number>>((accumulator, call) => {
      accumulator.set(call.outcome, (accumulator.get(call.outcome) ?? 0) + 1);
      return accumulator;
    }, new Map()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxOutcomeCount = Math.max(...outcomeGroups.map(([, count]) => count), 1);

  return (
    <section className="glass-card command-chart-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Recent outcomes</span>
          <h2>Call result distribution</h2>
        </div>
        <p>These bars are computed from the recent call outcomes currently available in the workspace.</p>
      </div>

      {outcomeGroups.length ? (
        <div className="command-bar-chart">
          {outcomeGroups.map(([outcome, count]) => {
            const normalized = Math.max((count / maxOutcomeCount) * 100, 16);

            return (
              <div key={outcome} className="command-bar-row">
                <div className="command-bar-label">
                  <strong>{outcome}</strong>
                  <span>{count} calls</span>
                </div>
                <div className="command-bar-track">
                  <div className="command-bar-fill" style={{ width: `${normalized}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-inline">No call outcomes are available for the recent traffic view yet.</div>
      )}
    </section>
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
    <section className="command-section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Campaigns</span>
          <h2>Outbound operations</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="command-compact-list command-compact-list-campaigns">
        {items.length ? (
          items.map((campaign) => (
            <article key={campaign.id} className="command-compact-item">
              <strong>{campaign.name}</strong>
              <p>{campaign.createdAt}</p>
              <span>{campaign.status}</span>
            </article>
          ))
        ) : (
          <div className="empty-inline">No campaigns have been launched from this workspace yet.</div>
        )}
      </div>
    </section>
  );
}
