import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRight,
  AudioLines,
  ChartNoAxesCombined,
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

const valuePills = ['10 live personas to test', '5 inbound + 5 outbound', 'OpenAI Realtime + cedar/marin'];

const platformCards = [
  {
    eyebrow: 'Unified workspace',
    title: 'See the entire voice operation from one login.',
    description:
      'Every assistant, call, lead, transcript, recording, and outbound campaign stays tied to the same BishopTech Voice workspace instead of getting buried across tools and inboxes.',
    icon: ChartNoAxesCombined,
    tone: 'large',
  },
  {
    eyebrow: 'Live demos',
    title: 'Let visitors test real personas before they book.',
    description:
      'The homepage now exposes ten live assistants so buyers can hear the stack instantly instead of waiting for a custom demo call.',
    icon: Sparkles,
    tone: 'small',
  },
  {
    eyebrow: 'Outbound',
    title: 'Run follow-up and blast campaigns without CSV chaos.',
    description:
      'Clean numbers, attach the right script, and launch outbound campaigns from the same stack that handles daily call routing.',
    icon: Send,
    tone: 'small',
  },
  {
    eyebrow: 'Workflow control',
    title: 'Map handoffs, objections, and call logic visually.',
    description:
      'Use the built-in canvas to show exactly how inbound, outbound, and specialist handoff should work before anything goes live.',
    icon: Workflow,
    tone: 'wide',
  },
];

const provisioningItems = [
  'Ten live homepage personas for instant browser testing and meeting qualification.',
  'Inbound voice assistants for missed calls, lead capture, qualification, and coverage.',
  'Outbound campaign assistants for follow-up, reminders, win-back, and reactivation.',
  'Dashboard access for leads, transcripts, recordings, campaigns, and reporting.',
];

const onboardingSteps = [
  {
    step: '01',
    title: 'Test the voices and book the strategy call',
    description:
      'Visitors can hear the personas on the homepage, then book the call once they know the quality, speed, and tone fit the brand.',
  },
  {
    step: '02',
    title: 'We build and provision the stack',
    description:
      'BishopTech configures the assistants, routing, prompt structure, dashboard access, and reporting layers for the business.',
  },
  {
    step: '03',
    title: 'Launch with lean ongoing management',
    description:
      'You get the platform plus $99 monthly management so the system stays tuned without paying an agency thousands just to babysit it.',
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

      <nav className="voice-topbar">
        <div className="voice-topbar-group">
          <a className="voice-brand" href="#top">
            <span className="voice-brand-mark">
              <LockKeyhole size={16} strokeWidth={2.2} />
            </span>
            <span>BishopTech Voice</span>
          </a>

          <div className="voice-nav-links">
            <a href="#personas">Live personas</a>
            <a href="#platform">Platform</a>
            <a href="#pricing">Pricing</a>
            <a href="#onboarding">Onboarding</a>
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
            <span className="voice-badge">Live AI voice personas on the homepage</span>
            <h1>
              Let buyers hear ten distinct <span>voice agents</span> before they ever book the call.
            </h1>
            <p>
              BishopTech Voice now gives prospects instant proof. They can test five inbound and five outbound
              assistants in the browser, hear realistic low-latency voice output, and understand the value before the
              meeting even starts. Then you take them into a real platform for onboarding, transcripts, recordings,
              campaigns, and ongoing management.
            </p>

            <div className="voice-cta-row">
              <a className="voice-primary-button" href="#personas">
                Test live personas
                <ArrowRight size={18} />
              </a>
              <a
                className="voice-secondary-button"
                href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Strategy%20Call"
              >
                Book strategy call
              </a>
            </div>

            <div className="voice-pill-row">
              {valuePills.map((pill) => (
                <span key={pill} className="voice-pill">
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <aside className="glass-card voice-login-card" id="sign-in">
            <div>
              <span className="voice-section-eyebrow">Secure entry</span>
              <h2>Sign in to BishopTech Voice</h2>
              <p>
                Existing accounts can sign in now. New workspaces are provisioned after the kickoff call and setup
                approval.
              </p>
            </div>

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

            <div className="voice-login-note">
              <span className="voice-section-eyebrow">What launch includes</span>
              <div className="voice-check-list">
                {provisioningItems.map((item) => (
                  <div key={item} className="voice-check-row">
                    <CheckCircle2 size={16} />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage ? <p className="notice error-notice">{errorMessage}</p> : null}
          </aside>
        </div>

        <div className="glass-card voice-command-board">
          <div className="voice-board-header">
            <div className="voice-board-status">
              <span className="voice-live-dot" />
              <span>BishopTech Voice demo layer</span>
            </div>
            <span className="voice-board-chip">Ten live persona testers</span>
          </div>

          <div className="voice-board-grid">
            <article className="voice-board-panel is-primary">
              <div className="voice-panel-icon">
                <PhoneCall size={18} />
              </div>
              <strong>Five inbound styles</strong>
              <p>Warm front desk, concierge, medical intake, dispatch, and legal-style intake ready for live browser tests.</p>
            </article>

            <article className="voice-board-panel">
              <div className="voice-panel-icon">
                <Send size={18} />
              </div>
              <strong>Five outbound styles</strong>
              <p>Callbacks, promos, reminders, consultative follow-up, and gentle win-back sequences ready to compare side by side.</p>
            </article>

            <article className="voice-board-panel">
              <div className="voice-panel-icon">
                <AudioLines size={18} />
              </div>
              <strong>Transcript proof</strong>
              <p>Visitors can watch the transcript stream in real time while they listen to the assistant handle their questions.</p>
            </article>

            <article className="voice-board-panel is-visual">
              <div className="voice-waveform">
                {Array.from({ length: 13 }).map((_, index) => (
                  <span key={index} style={{ animationDelay: `${index * 120}ms` }} />
                ))}
              </div>
              <div className="voice-board-footer">
                <span>Low latency</span>
                <span>Realistic voice</span>
                <span>Meeting-ready demos</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="voice-section" id="personas">
        <HomepagePersonaLab publicKey={appConfig.vapi.publicKey} personas={homepagePersonas} />
      </section>

      <section className="voice-section" id="platform">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Platform</span>
            <h2>One command center for the full voice stack.</h2>
          </div>
          <p>
            BishopTech Voice is built to replace fragmented agency services with one managed platform that is easier to
            launch, easier to operate, and far less expensive to keep running.
          </p>
        </div>

        <div className="voice-feature-grid">
          {platformCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className={`glass-card voice-feature-card ${card.tone === 'large' ? 'is-large' : ''} ${
                  card.tone === 'wide' ? 'is-wide' : ''
                }`}
              >
                <div className="voice-feature-icon">
                  <Icon size={22} />
                </div>
                <span className="voice-section-eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="voice-section" id="pricing">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Pricing</span>
            <h2>Pay for the build once. Keep management lean after launch.</h2>
          </div>
          <p>
            The point of BishopTech Voice is to make serious voice automation accessible without forcing businesses into
            another expensive agency retainer.
          </p>
        </div>

        <div className="voice-pricing-grid">
          <article className="glass-card voice-pricing-card">
            <span className="voice-section-eyebrow">What you pay</span>
            <h3>One-time setup fee + $99 monthly management</h3>
            <p>
              Setup covers planning, assistant provisioning, routing, dashboard access, launch preparation, and BYO-API
              configuration. After that, the ongoing management stays at $99 per month.
            </p>
            <div className="voice-check-list">
              <div className="voice-check-row">
                <ShieldCheck size={16} />
                <p>Done-for-you assistant build and provisioning.</p>
              </div>
              <div className="voice-check-row">
                <ShieldCheck size={16} />
                <p>Routing logic, voice selection, and workflow mapping included.</p>
              </div>
              <div className="voice-check-row">
                <ShieldCheck size={16} />
                <p>Lean monthly management instead of a bloated retainer.</p>
              </div>
            </div>
          </article>

          <article className="glass-card voice-pricing-card is-contrast">
            <span className="voice-section-eyebrow">What you avoid</span>
            <h3>No need to pay thousands just to have someone “manage” your voice agents.</h3>
            <p>
              You should not need an agency-sized invoice just to keep prompts updated, leads visible, and calls routed
              correctly. BishopTech Voice is built around fair pricing, direct execution, and practical support.
            </p>
            <div className="voice-avoid-grid">
              <div>
                <strong>No fragmented vendors</strong>
                <p>Assistants, demos, reporting, and outbound campaigns stay under one roof.</p>
              </div>
              <div>
                <strong>No inflated retainers</strong>
                <p>The platform replaces the usual $1,000+ monthly “management” model with something realistic.</p>
              </div>
              <div>
                <strong>No black-box handoffs</strong>
                <p>You can see the workflow, review the transcripts, and hear the recordings yourself.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="voice-section" id="onboarding">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Onboarding</span>
            <h2>How BishopTech Voice gets launched properly.</h2>
          </div>
          <p>
            This is not self-serve software dropped on your lap. The rollout starts with a real strategy call so the
            system is scoped around your business from day one.
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
            <span className="voice-section-eyebrow">Authority pages</span>
            <h2>Clear answers for buyers who want the economics to make sense.</h2>
          </div>
          <p>
            These pages break down the practical case for BishopTech Voice: why you do not need an agency wrapper, why
            the pricing is intentionally lean, and how most accounts can move from kickoff to launch within about 24
            hours.
          </p>
        </div>

        <div className="voice-authority-grid">
          {authorityPages.map((page) => (
            <article key={page.slug} className="glass-card voice-authority-card">
              <span className="voice-section-eyebrow">{page.eyebrow}</span>
              <h3>{page.title}</h3>
              <p>{page.description}</p>

              <div className="voice-pill-row">
                {page.pills.slice(0, 2).map((pill) => (
                  <span key={pill} className="voice-pill">
                    {pill}
                  </span>
                ))}
              </div>

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
          <h2>Let them test the quality first. Then close the meeting with proof already on the table.</h2>
          <p>
            The homepage now carries the first layer of selling for you. Visitors can hear the personas, review the
            transcript quality, and move straight into a strategy call when they are ready to see their own stack built.
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
