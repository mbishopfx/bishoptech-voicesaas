import Link from 'next/link';
import type { Route } from 'next';
import { AudioLines, Bot, ChartNoAxesCombined, PhoneCall, Send } from 'lucide-react';

import { CommandDeckPlayer } from '@/components/animated-voice-surfaces';
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
    <section className="metric-grid command-metric-grid ops-metric-grid">
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

export function ClientControlDeckSection({
  data,
}: {
  data: ClientDashboardData;
}) {
  const activeCall = data.recentCalls[0];
  const primaryAgent = data.agents[0];

  return (
    <section className="ops-overview-grid">
      <article className="glass-card ops-hero-panel">
        <div className="ops-panel-head">
          <div>
            <span className="eyebrow-text">Workspace pulse</span>
            <h2>{data.organizationName}</h2>
          </div>
          <span className="command-status-pill is-live">{data.planName ?? 'Managed'}</span>
        </div>

        <div className="ops-hero-visual">
          <CommandDeckPlayer className="command-deck-player" accent="violet" />
          <div className="ops-hero-overlay">
            <div>
              <span>Lead assistant</span>
              <strong>{primaryAgent?.name ?? 'Pending'}</strong>
            </div>
            <div>
              <span>Latest call</span>
              <strong>{activeCall?.outcome ?? 'Standby'}</strong>
            </div>
            <div>
              <span>Campaigns</span>
              <strong>{data.campaigns.length}</strong>
            </div>
          </div>
        </div>

        <div className="ops-kv-grid">
          <article className="ops-log-card">
            <span>Numbers</span>
            <strong>{data.phoneNumbers.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Agents</span>
            <strong>{data.agents.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Calls</span>
            <strong>{data.recentCalls.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Timezone</span>
            <strong>{data.timezone}</strong>
          </article>
        </div>
      </article>

      <div className="ops-glance-grid">
        <article className="glass-card ops-list-card">
          <div className="ops-panel-head">
            <div>
              <span className="eyebrow-text">Assistant stack</span>
              <strong>Live roles</strong>
            </div>
            <Bot size={16} />
          </div>
          <div className="ops-mini-feed">
            {data.agents.slice(0, 4).map((agent) => (
              <div key={agent.id} className="ops-mini-feed-row">
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
            ))}
            {!data.agents.length ? <div className="ops-empty-state">No agents assigned.</div> : null}
          </div>
        </article>

        <article className="glass-card ops-list-card">
          <div className="ops-panel-head">
            <div>
              <span className="eyebrow-text">Recent calls</span>
              <strong>Queue</strong>
            </div>
            <AudioLines size={16} />
          </div>
          <div className="ops-mini-feed">
            {data.recentCalls.slice(0, 4).map((call) => (
              <div key={call.id} className="ops-mini-feed-row">
                <strong>{call.caller}</strong>
                <span>{call.outcome}</span>
              </div>
            ))}
            {!data.recentCalls.length ? <div className="ops-empty-state">No calls logged.</div> : null}
          </div>
        </article>
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
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Agents</span>
          <h2>Assistant stack</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="ops-roster-grid">
        {items.length ? (
          items.map((agent) => (
            <article key={agent.id} className="glass-card ops-roster-card">
              <div className="ops-roster-head">
                <div>
                  <h3>{agent.name}</h3>
                  <p>{agent.role}</p>
                </div>
                <span className={`command-status-pill ${agent.status === 'live' ? 'is-live' : 'is-muted'}`}>
                  {agent.status}
                </span>
              </div>

              <div className="ops-kv-grid">
                <article className="ops-log-card">
                  <span>Voice</span>
                  <strong>{agent.voice}</strong>
                </article>
                <article className="ops-log-card">
                  <span>Model</span>
                  <strong>{agent.model}</strong>
                </article>
              </div>

              <div className="ops-summary-card">
                <p>{agent.purpose}</p>
              </div>

              <div className="ops-tag-row">
                <span className="surface-pill">Synced {agent.lastSyncedAt}</span>
                {agent.vapiAssistantId ? <span className="surface-pill">{agent.vapiAssistantId.slice(0, 8)}</span> : null}
              </div>
            </article>
          ))
        ) : (
          <div className="glass-card empty-state">
            <h4>No agents assigned.</h4>
          </div>
        )}
      </div>
    </section>
  );
}

export function ClientWorkspaceSummarySection({ data }: { data: ClientDashboardData }) {
  return (
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Workspace</span>
          <h2>Snapshot</h2>
        </div>
      </div>

      <div className="glass-card ops-list-card">
        <div className="ops-kv-grid">
          <article className="ops-log-card">
            <span>Plan</span>
            <strong>{data.planName ?? 'Managed'}</strong>
          </article>
          <article className="ops-log-card">
            <span>Numbers</span>
            <strong>{data.phoneNumbers.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Campaigns</span>
            <strong>{data.campaigns.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Blueprints</span>
            <strong>{data.recentBlueprints.length}</strong>
          </article>
        </div>

        <div className="ops-tag-row">
          {data.phoneNumbers.length ? (
            data.phoneNumbers.map((phoneNumber) => (
              <span key={phoneNumber} className="surface-pill">
                {phoneNumber}
              </span>
            ))
          ) : (
            <span className="surface-pill">No active number</span>
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
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Calls</span>
          <h2>Recent</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="ops-mini-feed">
        {items.length ? (
          items.map((call) => (
            <article key={call.id} className="ops-feed-card">
              <div className="ops-feed-top">
                <span>{call.direction}</span>
                <span>{call.createdAt}</span>
              </div>
              <strong>{call.caller}</strong>
              <p>{call.summary}</p>
              <div className="ops-feed-top">
                <span>{call.outcome}</span>
                <span>{call.duration}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="ops-empty-state">No calls logged.</div>
        )}
      </div>
    </section>
  );
}

export function ClientLeadsSection({ leads }: { leads: LeadRecord[] }) {
  return (
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Leads</span>
          <h2>Inbox</h2>
        </div>
      </div>

      <div className="table-shell compact-table">
        <div className="table-header">
          <span>Lead</span>
          <span>Intent</span>
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
          <div className="table-empty">No leads captured.</div>
        )}
      </div>
    </section>
  );
}

export function ClientCallLogSection({ recentCalls }: { recentCalls: RecentCall[] }) {
  return (
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Log</span>
          <h2>Calls</h2>
        </div>
      </div>

      <div className="table-shell compact-table">
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
                    {call.recordingLabel ?? 'Recording'}
                  </a>
                ) : (
                  'No asset'
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="table-empty">No calls recorded.</div>
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
    <section className="glass-card command-chart-panel ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Outcomes</span>
          <h2>Distribution</h2>
        </div>
      </div>

      {outcomeGroups.length ? (
        <div className="command-bar-chart">
          {outcomeGroups.map(([outcome, count]) => {
            const normalized = Math.max((count / maxOutcomeCount) * 100, 16);

            return (
              <div key={outcome} className="command-bar-row">
                <div className="command-bar-label">
                  <strong>{outcome}</strong>
                  <span>{count}</span>
                </div>
                <div className="command-bar-track">
                  <div className="command-bar-fill" style={{ width: `${normalized}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-empty-state">No outcomes yet.</div>
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
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Campaigns</span>
          <h2>Outbound</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="ops-mini-feed">
        {items.length ? (
          items.map((campaign) => (
            <article key={campaign.id} className="ops-feed-card">
              <strong>{campaign.name}</strong>
              <p>{campaign.createdAt}</p>
              <span>{campaign.status}</span>
            </article>
          ))
        ) : (
          <div className="ops-empty-state">No campaigns launched.</div>
        )}
      </div>
    </section>
  );
}
