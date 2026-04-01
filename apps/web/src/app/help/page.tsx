import { AppShell } from '@/components/app-shell';
import { requireViewer } from '@/lib/auth';

const promptStarters = [
  'How should I configure after-hours missed-call recovery for this organization?',
  'Which client-safe settings can be exposed without risking agent drift?',
  'How should Vapi webhook payloads map to calls, contacts, and transcript assets?',
  'What is the cleanest handoff path from a demo assistant into a production org?',
];

export default async function HelpPage() {
  const viewer = await requireViewer();

  return (
    <AppShell
      current="help"
      viewer={viewer}
      activeNav="playbooks"
      eyebrow="Playbooks"
      title="Operating notes, implementation rules, and launch guidance."
      description="Use this section for rollout notes, route contracts, and the operating rules behind how the platform is provisioned and managed."
    >
      <section className="workspace-grid workspace-grid-wide">
        <article className="glass-card workspace-card">
          <div className="workspace-card-top">
            <div>
              <span className="eyebrow-text">Setup model</span>
              <h4>Kickoff call first</h4>
            </div>
          </div>
          <p>The product is sold through a booked onboarding call so the workflow, scope, number strategy, and reporting expectations are clear before setup starts.</p>
        </article>

        <article className="glass-card workspace-card">
          <div className="workspace-card-top">
            <div>
              <span className="eyebrow-text">Pricing model</span>
              <h4>Simple and transparent</h4>
            </div>
          </div>
          <p>One-time setup fee to get the system live, then $99 monthly management. The goal is to undercut the usual $1,000+ voice-agent markup without sacrificing quality.</p>
        </article>
      </section>

      <section className="section-block command-anchor" id="prompt-starters">
        <div className="section-header">
          <div>
            <span className="eyebrow-text">Prompt starters</span>
            <h3>Questions worth answering inside the copilot</h3>
          </div>
        </div>

        <div className="workspace-grid">
          {promptStarters.map((prompt) => (
            <article key={prompt} className="glass-card blueprint-card">
              <strong>{prompt}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block command-anchor" id="live-routes">
        <div className="section-header">
          <div>
            <span className="eyebrow-text">Live routes</span>
            <h3>Current API contracts</h3>
          </div>
        </div>

        <div className="table-shell">
          <div className="table-header">
            <span>Route</span>
            <span>Purpose</span>
          </div>
          <div className="table-row">
            <div>
              <strong>POST /api/demo-template</strong>
              <p>Generates and saves a demo blueprint from website + GBP text.</p>
            </div>
            <div>Admin and client-authenticated users</div>
          </div>
          <div className="table-row">
            <div>
              <strong>POST /api/demo-call</strong>
              <p>Creates a Vapi assistant and launches the outbound demo call.</p>
            </div>
            <div>Platform admin only</div>
          </div>
          <div className="table-row">
            <div>
              <strong>POST /api/admin/onboard-client</strong>
              <p>Creates the client login, organization, membership rows, and the three-assistant stack.</p>
            </div>
            <div>Platform admin only</div>
          </div>
          <div className="table-row">
            <div>
              <strong>POST /api/blast-campaign</strong>
              <p>Parses CSV uploads, normalizes recipients, launches the campaign, and stores recipient rows.</p>
            </div>
            <div>Manage-org roles only</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
