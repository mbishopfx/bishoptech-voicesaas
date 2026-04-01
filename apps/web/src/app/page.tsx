import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  LockKeyhole,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { loginAction } from '@/app/auth/actions';
import { HomepagePersonaLab } from '@/components/homepage-persona-lab';
import { authorityPages } from '@/lib/authority-pages';
import { getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { homepagePersonas } from '@/lib/homepage-personas';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const heroSignals = [
  { label: 'Latency', value: '120ms', detail: 'voice routing response' },
  { label: 'Coverage', value: '24/7', detail: 'inbound and outbound flow' },
  { label: 'Voices', value: '10 live', detail: 'homepage personas ready to test' },
];

const launchInclusions = [
  'Ten live Vapi personas embedded on the homepage for instant proof.',
  'Inbound and outbound assistants mapped to your actual business flow.',
  'Workspace access for transcripts, recordings, campaigns, and live reporting.',
  'Lean monthly management after setup instead of an inflated agency retainer.',
];

const platformCards = [
  {
    eyebrow: 'Live persona lab',
    title: 'Let buyers hear the stack before they ever book.',
    description:
      'The homepage exposes ten live assistants tied to your Vapi account, so visitors can evaluate tone, pacing, and transcript quality in the browser.',
    icon: AudioLines,
  },
  {
    eyebrow: 'Command center',
    title: 'Operate calls, campaigns, and routing from one interface.',
    description:
      'The platform keeps inbound coverage, outbound campaigns, recordings, and workspace reporting inside the same Bishop Tech control surface.',
    icon: PhoneCall,
  },
  {
    eyebrow: 'Workflow boards',
    title: 'Show the handoff logic before anything goes live.',
    description:
      'Visual workflow maps make objections, escalations, specialist routing, and follow-up paths easier to approve and maintain.',
    icon: Workflow,
  },
  {
    eyebrow: 'Managed launch',
    title: 'Keep ownership without paying for agency theater.',
    description:
      'Bishop Tech handles the build, prompt structure, provisioning, and optimization while keeping ongoing management intentionally lean.',
    icon: ShieldCheck,
  },
];

const workflowRail = [
  {
    id: '01',
    title: 'Capture the intent',
    body: 'Voice, transcript, caller context, and first-party business rules stay connected from the first utterance.',
  },
  {
    id: '02',
    title: 'Route the response',
    body: 'Assistants can resolve, escalate, schedule, qualify, or trigger outbound follow-up from the same orchestration layer.',
  },
  {
    id: '03',
    title: 'Close the loop',
    body: 'Calls, outcomes, recordings, and campaigns land back in the workspace so the operation stays visible after launch.',
  },
];

const pricingPoints = [
  'One-time setup for planning, provisioning, prompt architecture, and launch prep.',
  '$99 monthly management after launch.',
  'Bring your own API stack and keep visibility into the operating layer.',
];

const onboardingSteps = [
  {
    step: '01',
    title: 'Test the personas and define the operating model',
    description:
      'Visitors hear the assistants first, then we scope the production flow around your calls, objections, goals, and escalation paths.',
  },
  {
    step: '02',
    title: 'Provision the workspace and voice stack',
    description:
      'Bishop Tech configures assistants, routing, numbers, workflow boards, dashboards, and live demo surfaces around the approved plan.',
  },
  {
    step: '03',
    title: 'Launch with a clean reporting layer',
    description:
      'Your team gets a real control surface for calls, leads, recordings, and campaigns instead of waiting on an agency to explain what happened.',
  },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const viewer = await getViewerContext();

  if (viewer) {
    redirect('/launch' as Route);
  }

  const params = await searchParams;
  const errorMessage = params?.error ? decodeURIComponent(params.error) : '';

  return (
    <main className="voice-landing-shell">
      <div className="voice-orb voice-orb-mint" />
      <div className="voice-orb voice-orb-violet" />
      <div className="voice-grid-overlay" />

      <nav className="voice-topbar">
        <div className="voice-topbar-group">
          <a className="voice-brand" href="#top">
            <span className="voice-brand-mark">
              <LockKeyhole size={16} strokeWidth={2.2} />
            </span>
            <span>BishopTech Voice</span>
          </a>

          <div className="voice-nav-links">
            <a href="#personas">Personas</a>
            <a href="#platform">Platform</a>
            <a href="#workflow">Workflow</a>
            <a href="#pricing">Pricing</a>
            <a href="#insights">Insights</a>
          </div>
        </div>

        <div className="voice-topbar-actions">
          <a className="voice-topbar-link" href="#sign-in">
            Sign in
          </a>
          <a
            className="voice-primary-button"
            href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Strategy%20Call"
          >
            Book strategy call
          </a>
        </div>
      </nav>

      <section className="voice-hero-section" id="top">
        <div className="voice-hero-grid">
          <div className="voice-hero-copy">
            <span className="voice-badge">Bishop Tech voice platform</span>
            <h1>
              A voice AI platform that feels like a <span>real command center</span>, not a loose stack of tools.
            </h1>
            <p>
              This project now sells and operates the same way. Buyers can test live personas on the homepage, then
              move into a Bishop Tech workspace for onboarding, routing, transcripts, recordings, workflow boards, and
              outbound campaigns.
            </p>

            <div className="voice-cta-row">
              <a className="voice-primary-button" href="#personas">
                Test live personas
                <ArrowRight size={18} />
              </a>
              <a className="voice-secondary-button" href="#platform">
                Explore the platform
              </a>
            </div>

            <div className="voice-stat-grid">
              {heroSignals.map((signal) => (
                <article key={signal.label} className="glass-card voice-stat-card">
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="glass-card voice-signal-panel">
            <div className="voice-panel-head">
              <div>
                <span className="voice-section-eyebrow">Live signal</span>
                <h2>Mission control for demos, routing, and launch</h2>
              </div>
              <span className="voice-live-chip">Active</span>
            </div>

            <div className="voice-panel-console">
              <div className="voice-signal-field">
                <div className="voice-signal-header">
                  <span>BishopTech Voice OS</span>
                  <span>NODE-7 / ORD</span>
                </div>
                <pre className="voice-signal-ascii">{`[::] live transcript   -> intent parse
[//] semantic routing -> agent dispatch
[==] crm context      -> next best action
[##] outbound queue   -> follow-up trigger`}</pre>
                <div className="voice-signal-meters" aria-hidden="true">
                  {Array.from({ length: 11 }).map((_, index) => (
                    <span key={index} style={{ animationDelay: `${index * 120}ms` }} />
                  ))}
                </div>
              </div>

              <div className="voice-panel-stack">
                <article className="voice-console-card">
                  <span className="voice-section-eyebrow">AI console</span>
                  <div className="voice-console-log">
                    <p>
                      <strong>[agent]</strong> I can answer questions, qualify callers, and route the conversation in
                      real time.
                    </p>
                    <p>
                      <strong>[system]</strong> Vapi assistant live, transcript streaming, escalation path armed.
                    </p>
                    <p>
                      <strong>[ops]</strong> Homepage demos and client workspaces now share the same Bishop Tech design
                      language.
                    </p>
                  </div>
                </article>

                <article className="voice-console-card">
                  <span className="voice-section-eyebrow">Launch stack</span>
                  <div className="voice-console-list">
                    <div>
                      <strong>Homepage personas</strong>
                      <p>Five inbound and five outbound assistants live in-browser.</p>
                    </div>
                    <div>
                      <strong>Workflow control</strong>
                      <p>Routing boards, onboarding studio, and campaign surfaces inside the product.</p>
                    </div>
                    <div>
                      <strong>Workspace reporting</strong>
                      <p>Calls, outcomes, recordings, and summaries stay visible after launch.</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="voice-entry-strip" id="sign-in">
        <div className="glass-card voice-login-card">
          <div className="voice-panel-head">
            <div>
              <span className="voice-section-eyebrow">Secure entry</span>
              <h2>Sign in to the Bishop Tech workspace</h2>
            </div>
          </div>
          <p>
            Existing customers can enter now. New workspaces are provisioned after the kickoff call so the platform is
            scoped around the real business before anything goes live.
          </p>

          <form className="voice-login-form" action={loginAction}>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="you@yourbusiness.com" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" placeholder="Enter your password" required />
            </label>
            <button className="voice-primary-button voice-button-full" type="submit">
              Enter platform
            </button>
          </form>

          {errorMessage ? <p className="notice error-notice">{errorMessage}</p> : null}
        </div>

        <div className="voice-utility-grid">
          <article className="glass-card voice-utility-card">
            <span className="voice-section-eyebrow">Included at launch</span>
            <div className="voice-check-list">
              {launchInclusions.map((item) => (
                <div key={item} className="voice-check-row">
                  <CheckCircle2 size={16} />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-card voice-utility-card is-highlight">
            <span className="voice-section-eyebrow">Project scope</span>
            <div className="voice-console-list">
              <div>
                <strong>Homepage</strong>
                <p>Live persona testing and direct proof of voice quality.</p>
              </div>
              <div>
                <strong>Admin command center</strong>
                <p>Account load, recent call activity, onboarding, and workflow control.</p>
              </div>
              <div>
                <strong>Client workspace</strong>
                <p>Agents, transcripts, campaigns, outcomes, and reporting in one login.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="voice-section" id="personas">
        <HomepagePersonaLab publicKey={appConfig.vapi.publicKey} personas={homepagePersonas} />
      </section>

      <section className="voice-section" id="platform">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Platform</span>
            <h2>Designed around the actual Bishop Tech voice workflow.</h2>
          </div>
          <p>
            This redesign is not generic SaaS chrome. It is scoped around the project in this repo: live Vapi demos,
            onboarding, workflow boards, call visibility, and outbound campaign management.
          </p>
        </div>

        <div className="voice-feature-grid">
          {platformCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="glass-card voice-feature-card">
                <div className="voice-feature-icon">
                  <Icon size={20} />
                </div>
                <span className="voice-section-eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="voice-section" id="workflow">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Workflow</span>
            <h2>From the first utterance to the final follow-up.</h2>
          </div>
          <p>
            The product now frames the operating story clearly: capture context, route intelligently, and keep the
            downstream reporting visible inside the same Bishop Tech surface.
          </p>
        </div>

        <div className="voice-workflow-grid">
          {workflowRail.map((step) => (
            <article key={step.id} className="glass-card voice-workflow-card">
              <span className="voice-workflow-step">{step.id}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}

          <aside className="glass-card voice-stack-card">
            <span className="voice-section-eyebrow">System spine</span>
            <h3>What the platform is centered around</h3>
            <div className="voice-stack-grid">
              <div>
                <strong>Vapi assistants</strong>
                <p>Live voices for inbound and outbound scenarios.</p>
              </div>
              <div>
                <strong>Realtime transcripts</strong>
                <p>Proof during demos and visibility after production calls.</p>
              </div>
              <div>
                <strong>Workflow boards</strong>
                <p>Shared planning layer for routing, handoffs, and objections.</p>
              </div>
              <div>
                <strong>Outbound campaigns</strong>
                <p>One workspace for callback, reminder, and reactivation flows.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="voice-section" id="pricing">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Pricing</span>
            <h2>Build it once. Keep the management lean.</h2>
          </div>
          <p>
            The product story stays direct: Bishop Tech builds the stack, keeps it visible, and avoids the agency
            pattern where “management” becomes the expensive part.
          </p>
        </div>

        <div className="voice-pricing-grid">
          <article className="glass-card voice-pricing-card">
            <span className="voice-section-eyebrow">What you pay</span>
            <h3>One-time setup fee plus $99 monthly management</h3>
            <p>
              Setup covers planning, provisioning, prompt structure, workflow design, dashboard access, and launch
              readiness. Ongoing management stays intentionally lean after that.
            </p>
            <div className="voice-check-list">
              {pricingPoints.map((item) => (
                <div key={item} className="voice-check-row">
                  <ShieldCheck size={16} />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-card voice-pricing-card is-contrast">
            <span className="voice-section-eyebrow">What you avoid</span>
            <h3>No fragmented vendors. No black-box handoffs. No fake operating layer.</h3>
            <p>
              Buyers can hear the product quality, admins can see the live account load, and clients can work from a
              real dashboard instead of waiting on outside reports to explain what happened.
            </p>
          </article>
        </div>
      </section>

      <section className="voice-section" id="onboarding">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Onboarding</span>
            <h2>Launch the right voice operation, not just a prettier demo.</h2>
          </div>
          <p>
            The redesign is tied to a real operating model, so onboarding now reads as a system build with clear
            workspace outcomes instead of vague setup promises.
          </p>
        </div>

        <div className="voice-steps-grid">
          {onboardingSteps.map((step) => (
            <article key={step.step} className="glass-card voice-step-card">
              <span className="voice-step-number">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="voice-section" id="insights">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Insights</span>
            <h2>Authority pages that support the new platform story.</h2>
          </div>
          <p>
            The authority layer still matters, but it now sits behind a clearer product narrative and a stronger Bishop
            Tech visual system.
          </p>
        </div>

        <div className="voice-authority-grid">
          {authorityPages.slice(0, 3).map((page) => (
            <article key={page.slug} className="glass-card voice-authority-card">
              <span className="voice-section-eyebrow">{page.eyebrow}</span>
              <h3>{page.title}</h3>
              <p>{page.description}</p>
              <Link className="voice-inline-link" href={`/insights/${page.slug}` as Route}>
                Read the full breakdown
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="voice-final-section">
        <div className="glass-card voice-final-card">
          <span className="voice-section-eyebrow">BishopTech Voice</span>
          <h2>Let them hear the system first, then let them step into the platform that runs it.</h2>
          <p>
            The redesign now frames the project as one Bishop Tech voice product from the first homepage demo to the
            admin and client command centers behind login.
          </p>
          <div className="voice-cta-row">
            <a className="voice-primary-button" href="#personas">
              Test live personas
            </a>
            <a
              className="voice-secondary-button"
              href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Strategy%20Call"
            >
              Book strategy call
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
