import Link from 'next/link';
import type { Route } from 'next';
import { Activity, AudioLines, Bot, Building2, PhoneCall, Send } from 'lucide-react';

import { CommandDeckPlayer } from '@/components/animated-voice-surfaces';
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
    <section className="ops-overview-grid">
      <article className="glass-card ops-hero-panel">
        <div className="ops-panel-head">
          <div>
            <span className="eyebrow-text">Platform pulse</span>
            <h2>Admin command view</h2>
          </div>
          <span className="command-status-pill is-live">Live</span>
        </div>

        <div className="ops-hero-visual">
          <CommandDeckPlayer className="command-deck-player" accent="cyan" />
          <div className="ops-hero-overlay">
            <div>
              <span>Latest call</span>
              <strong>{activeCall ? activeCall.organizationName : 'Waiting for traffic'}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{activeCall?.outcome ?? 'Standby'}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{activeCall?.duration ?? '0m'}</strong>
            </div>
          </div>
        </div>

        <div className="ops-kv-grid">
          <article className="ops-log-card">
            <span>Active orgs</span>
            <strong>{activeOrganizations}</strong>
          </article>
          <article className="ops-log-card">
            <span>Live agents</span>
            <strong>{liveAgents}</strong>
          </article>
          <article className="ops-log-card">
            <span>Recent calls</span>
            <strong>{recentCalls.length}</strong>
          </article>
          <article className="ops-log-card">
            <span>Campaigns</span>
            <strong>{metrics[3]?.value ?? '0'}</strong>
          </article>
        </div>
      </article>

      <div className="ops-glance-grid">
        <article className="glass-card ops-list-card">
          <div className="ops-panel-head">
            <div>
              <span className="eyebrow-text">Live queue</span>
              <strong>Calls in review</strong>
            </div>
            <AudioLines size={16} />
          </div>
          <div className="ops-mini-feed">
            {recentCalls.slice(0, 4).map((call) => (
              <div key={call.id} className="ops-mini-feed-row">
                <strong>{call.organizationName}</strong>
                <span>{call.outcome}</span>
              </div>
            ))}
            {!recentCalls.length ? <div className="ops-empty-state">No calls logged.</div> : null}
          </div>
        </article>

        <article className="glass-card ops-list-card">
          <div className="ops-panel-head">
            <div>
              <span className="eyebrow-text">Watch list</span>
              <strong>Accounts</strong>
            </div>
            <Activity size={16} />
          </div>
          <div className="ops-mini-feed">
            {organizations.slice(0, 4).map((organization) => (
              <div key={organization.id} className="ops-mini-feed-row">
                <strong>{organization.name}</strong>
                <span>{organization.liveAgentCount} agents</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function AdminMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section className="metric-grid command-metric-grid ops-metric-grid">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? Bot;

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
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Organizations</span>
          <h2>Roster</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="ops-roster-grid">
        {items.length ? (
          items.map((organization) => (
            <article key={organization.id} className="glass-card ops-roster-card">
              <div className="ops-roster-head">
                <div>
                  <h3>{organization.name}</h3>
                  <p>{organization.slug}</p>
                </div>
                <span className={`command-status-pill ${organization.isActive ? 'is-live' : 'is-muted'}`}>
                  {organization.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="ops-kv-grid">
                <article className="ops-log-card">
                  <span>Plan</span>
                  <strong>{organization.planName ?? 'Managed'}</strong>
                </article>
                <article className="ops-log-card">
                  <span>Members</span>
                  <strong>{organization.memberCount}</strong>
                </article>
                <article className="ops-log-card">
                  <span>Agents</span>
                  <strong>
                    {organization.liveAgentCount}/{organization.agentCount}
                  </strong>
                </article>
                <article className="ops-log-card">
                  <span>Last call</span>
                  <strong>{organization.lastCallAt ? formatRelativeTime(organization.lastCallAt) : 'No calls'}</strong>
                </article>
              </div>

              <div className="ops-summary-card">
                <p>{organization.latestCallSummary ?? 'No call summary yet.'}</p>
              </div>

              <div className="ops-tag-row">
                {organization.phoneNumbers.length ? (
                  organization.phoneNumbers.map((phoneNumber) => (
                    <span key={phoneNumber} className="surface-pill">
                      {phoneNumber}
                    </span>
                  ))
                ) : (
                  <span className="surface-pill">No number</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="glass-card empty-state">
            <h4>No organizations yet.</h4>
          </div>
        )}
      </div>
    </section>
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
              <strong>{call.organizationName}</strong>
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
    <section className="command-section-block ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Demos</span>
          <h2>Blueprints</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="ops-mini-feed">
        {items.length ? (
          items.map((blueprint) => (
            <article key={blueprint.id} className="ops-feed-card">
              <strong>{blueprint.title}</strong>
              <p>{blueprint.websiteUrl ?? 'No source URL'}</p>
              <span>{blueprint.createdAt}</span>
            </article>
          ))
        ) : (
          <div className="ops-empty-state">No blueprints saved.</div>
        )}
      </div>
    </section>
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
  const maxAgentCount = Math.max(...items.map((organization) => organization.liveAgentCount), 1);

  return (
    <section className="glass-card command-chart-panel ops-section-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Load</span>
          <h2>Agent volume</h2>
        </div>
      </div>

      {items.length ? (
        <div className="command-bar-chart">
          {items.map((organization) => {
            const normalized = Math.max((organization.liveAgentCount / maxAgentCount) * 100, organization.liveAgentCount ? 16 : 6);

            return (
              <div key={organization.id} className="command-bar-row">
                <div className="command-bar-label">
                  <strong>{organization.name}</strong>
                  <span>{organization.liveAgentCount} live</span>
                </div>
                <div className="command-bar-track">
                  <div className="command-bar-fill" style={{ width: `${normalized}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ops-empty-state">No organization data.</div>
      )}
    </section>
  );
}
