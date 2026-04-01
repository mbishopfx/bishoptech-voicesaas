import Link from 'next/link';
import type { Route } from 'next';
import { AudioLines, Bot, Building2, PhoneCall, Send, Sparkles } from 'lucide-react';

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
  const surfacedMetrics = metrics.slice(0, 4);

  return (
    <section className="glass-card command-control-deck">
      <div className="command-control-head">
        <div>
          <span className="eyebrow-text">Platform control</span>
          <h2>Live account visibility without the clutter</h2>
          <p>
            Watch conversation volume, client readiness, and rollout health from one fluid surface instead of digging
            through disconnected tools.
          </p>
        </div>
        <span className="command-status-pill is-live">Traffic flowing</span>
      </div>

      <div className="command-session-grid">
        <div className="command-session-panel">
          <div className="command-panel-head">
            <div>
              <span className="eyebrow-text">Live pulse</span>
              <h3>{activeCall ? `${activeCall.organizationName} • ${activeCall.direction} conversation` : 'Waiting for the next conversation'}</h3>
            </div>
            <AudioLines size={18} />
          </div>

          <div className="command-live-visual">
            <CommandDeckPlayer className="command-deck-player" accent="cyan" />
            <div className="command-live-fabric" aria-hidden="true">
              <span>accounts / calls / coverage / readiness</span>
              <span>░░ live call pulse moving across every workspace ░░</span>
            </div>
            <div className="command-live-overlay">
              <span>{activeCall?.organizationName ?? 'Platform wide view'}</span>
              <strong>{activeCall?.outcome ?? 'Monitoring active conversations and workspace health'}</strong>
            </div>
          </div>

          <p className="command-card-copy">
            {activeCall?.summary ??
              'Recent call summaries will surface here once the first live conversations land in the platform.'}
          </p>

          <div className="command-stat-strip">
            <div>
              <span>Latest outcome</span>
              <strong>{activeCall?.outcome ?? 'Idle'}</strong>
            </div>
            <div>
              <span>Talk time</span>
              <strong>{activeCall?.duration ?? 'No recent call'}</strong>
            </div>
            <div>
              <span>Direction</span>
              <strong>{activeCall?.direction ?? 'standby'}</strong>
            </div>
          </div>
        </div>

        <div className="command-console-stack">
          <article className="command-transcript-panel">
            <div className="command-panel-head">
              <div>
                <span className="eyebrow-text">Highlights</span>
                <h3>What needs attention</h3>
              </div>
            </div>

            <div className="command-console-log">
              <p>
                <strong>Latest summary</strong> {activeCall?.summary ?? 'No live transcript available yet.'}
              </p>
              <p>
                <strong>Accounts live</strong> {activeOrganizations} active organizations are currently provisioned
                across the Bishop Tech platform.
              </p>
              <p>
                <strong>Assistants ready</strong> {liveAgents} live assistants are visible across onboarding, demo, and
                production workspaces.
              </p>
            </div>
          </article>

          <article className="command-routing-panel">
            <div className="command-panel-head">
              <div>
                <span className="eyebrow-text">Readiness</span>
                <h3>Coverage checkpoints</h3>
              </div>
            </div>

            <div className="command-route-list">
              <div>
                <span>Account health</span>
                <strong>{activeOrganizations} live</strong>
              </div>
              <div>
                <span>Recent activity</span>
                <strong>{recentCalls.length} recent events</strong>
              </div>
              <div>
                <span>Assistant coverage</span>
                <strong>{liveAgents} active agents</strong>
              </div>
            </div>
          </article>
        </div>

        <div className="command-mini-grid">
          {surfacedMetrics.map((metric) => (
            <article key={metric.label} className={`command-mini-card tone-${metric.tone ?? 'neutral'}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.delta}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminMetricsGrid({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section className="metric-grid command-metric-grid">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index] ?? Sparkles;

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
    <section className="command-section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Organizations</span>
          <h2>Live account roster</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="command-organization-grid">
        {items.length ? (
          items.map((organization) => (
            <article key={organization.id} className="glass-card command-organization-card">
              <div className="command-organization-top">
                <div>
                  <h3>{organization.name}</h3>
                  <p>{organization.slug}</p>
                </div>
                <span className={`command-status-pill ${organization.isActive ? 'is-live' : 'is-muted'}`}>
                  {organization.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="command-stat-strip">
                <div>
                  <span>Plan</span>
                  <strong>{organization.planName ?? 'Managed workspace'}</strong>
                </div>
                <div>
                  <span>Members</span>
                  <strong>{organization.memberCount}</strong>
                </div>
                <div>
                  <span>Agents</span>
                  <strong>
                    {organization.liveAgentCount}/{organization.agentCount}
                  </strong>
                </div>
                <div>
                  <span>Last call</span>
                  <strong>{organization.lastCallAt ? formatRelativeTime(organization.lastCallAt) : 'No calls yet'}</strong>
                </div>
              </div>

              <p className="command-card-copy">
                {organization.latestCallSummary ?? 'No summary has been logged for this organization yet.'}
              </p>

              <div className="pill-row">
                {organization.phoneNumbers.length ? (
                  organization.phoneNumbers.map((phoneNumber) => (
                    <span key={phoneNumber} className="surface-pill">
                      {phoneNumber}
                    </span>
                  ))
                ) : (
                  <span className="surface-pill">No active phone number stored</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="glass-card empty-state">
            <h4>No organizations have been provisioned yet.</h4>
            <p>Use the onboarding page to create the first BishopTech Voice workspace.</p>
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
              <strong>{call.organizationName}</strong>
              <p>{call.summary}</p>
              <div className="command-activity-footer">
                <span>{call.outcome}</span>
                <span>{call.duration}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-inline">No calls have been logged yet.</div>
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
    <section className="command-section-block">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Saved demos</span>
          <h2>Recent blueprint history</h2>
        </div>
        <SectionAction href={actionHref} label={actionLabel} />
      </div>

      <div className="command-compact-list">
        {items.length ? (
          items.map((blueprint) => (
            <article key={blueprint.id} className="command-compact-item">
              <strong>{blueprint.title}</strong>
              <p>{blueprint.websiteUrl ?? 'No website captured'}</p>
              <span>{blueprint.createdAt}</span>
            </article>
          ))
        ) : (
          <div className="empty-inline">No demo blueprints have been saved yet.</div>
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
    <section className="glass-card command-chart-panel">
      <div className="command-section-header">
        <div>
          <span className="eyebrow-text">Organization load</span>
          <h2>Live agent volume by account</h2>
        </div>
        <p>Bar lengths are normalized from the current live agent count across the organizations shown below.</p>
      </div>

      {items.length ? (
        <div className="command-bar-chart">
          {items.map((organization) => {
            const normalized = Math.max((organization.liveAgentCount / maxAgentCount) * 100, organization.liveAgentCount ? 20 : 8);

            return (
              <div key={organization.id} className="command-bar-row">
                <div className="command-bar-label">
                  <strong>{organization.name}</strong>
                  <span>{organization.liveAgentCount} live agents</span>
                </div>
                <div className="command-bar-track">
                  <div className="command-bar-fill" style={{ width: `${normalized}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-inline">No organization data is available for the load view yet.</div>
      )}
    </section>
  );
}
