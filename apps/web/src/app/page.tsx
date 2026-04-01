import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  Headphones,
  LockKeyhole,
  MessagesSquare,
  PhoneCall,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { loginAction } from '@/app/auth/actions';
import { CommandDeckPlayer, MatrixHeroPlayer, MatrixTerminalPlayer } from '@/components/animated-voice-surfaces';
import { HomepagePersonaLab } from '@/components/homepage-persona-lab';
import { getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';
import { homepagePersonas } from '@/lib/homepage-personas';

export const dynamic = 'force-dynamic';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const statusPills = ['INBOUND + OUTBOUND', 'BRAND-TRAINED', 'BOOKING + FOLLOW-UP'];

const trustRail = ['Sales teams', 'Support desks', 'Service businesses', 'Schedulers', 'After-hours coverage'];

const heroVisualCards = [
  {
    label: 'Brand voice',
    value: 'Answers shaped around your tone, offers, and FAQs.',
    tone: 'cyan',
  },
  {
    label: 'Conversation outcomes',
    value: 'Book, qualify, route, and follow up from the same call.',
    tone: 'violet',
  },
  {
    label: 'Live visibility',
    value: 'Calls, transcripts, workflows, and CRM updates in one loop.',
    tone: 'mint',
  },
];

const matrixCards = [
  {
    code: 'SALES',
    title: 'Sales closer',
    description:
      'Guide buyers from the first question to the booked appointment or payment without losing your tone.',
    bullets: ['Handles objections naturally', 'Books from the call', 'Pushes clean CRM notes'],
    icon: PhoneCall,
    tone: 'cyan',
  },
  {
    code: 'SUPPORT',
    title: 'Support guide',
    description: 'Answer common issues, pull the right knowledge, and hand off with context when a human should step in.',
    bullets: ['Pulls from your KB', 'Knows when to escalate', 'Summarizes every call'],
    icon: Headphones,
    tone: 'violet',
  },
  {
    code: 'QUALIFICATION',
    title: 'Lead qualifier',
    description: 'Screen, score, and route incoming interest fast enough for your team to act while intent is still high.',
    bullets: ['Captures fit signals early', 'Routes by priority', 'Triggers instant follow-up'],
    icon: Workflow,
    tone: 'mint',
  },
];

const deconstructionItems = [
  {
    title: 'Learns your language',
    body: 'Offers, policies, talk tracks, and FAQs get translated into call behavior that sounds like your team on its best day.',
    icon: MessagesSquare,
    tone: 'cyan',
  },
  {
    title: 'Moves with the caller',
    body: 'Each conversation can slow down, reassure, qualify harder, or hand off faster based on the moment in front of it.',
    icon: ShieldCheck,
    tone: 'violet',
  },
  {
    title: 'Keeps every next step connected',
    body: 'Calls, transcripts, scheduling, CRM updates, and workflows stay stitched together instead of living in separate tools.',
    icon: Sparkles,
    tone: 'mint',
  },
];

const terminalLines = [
  '> Listening for intent, urgency, and call context...',
  '> Pulling answers from your scripts, FAQs, and offers.',
  '> Routing to booking, follow-up, or the right human when needed.',
  '> Saving transcript highlights, tags, and next steps automatically.',
];

const useCaseCards = [
  {
    title: 'Sales',
    body: 'Qualification, objection handling, booking, and payment-ready follow-up from the same voice layer.',
    icon: Send,
  },
  {
    title: 'Support',
    body: 'First-line troubleshooting, policy guidance, callback management, and clean escalation notes every time.',
    icon: Headphones,
  },
  {
    title: 'Qualification',
    body: 'Lead scoring, transcript tagging, CRM enrichment, and booking logic designed for fast human review.',
    icon: ChartNoAxesCombined,
  },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const viewer = await getViewerContext();
  const authConfigured = Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);

  if (viewer) {
    redirect('/launch');
  }

  const params = await searchParams;
  const errorMessage = params?.error ? decodeURIComponent(params.error) : '';

  return (
    <main className="matrix-landing-shell">
      <div className="matrix-background-grid" />
      <div className="matrix-shell">
        <header className="matrix-topbar">
          <a className="matrix-brand" href="#top">
            <span>VOICE AI</span>
          </a>

          <nav className="matrix-nav">
            <a href="#sandbox">NEXUS</a>
            <a href="#matrix" className="is-active">
              MATRIX
            </a>
            <a href="#terminal">TERMINAL</a>
            <a href="#security">DOCS</a>
          </nav>

          <div className="matrix-topbar-tools">
            <button className="matrix-icon-button" type="button" aria-label="Platform settings">
              <Settings2 size={16} />
            </button>
            <button className="matrix-icon-button" type="button" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <a className="matrix-primary-button" href="#sign-in">
              Deploy Agent
            </a>
          </div>
        </header>

        <section className="matrix-hero" id="top">
          <div className="matrix-hero-copy">
            <span className="matrix-kicker">Bishop Tech Voice Platform</span>
            <h1>
              Voice agents made for
              <span>your business&apos;s voice.</span>
            </h1>
            <p>
              Train inbound and outbound voice agents to sound on-brand, route conversations correctly, and turn every
              call into a booked meeting, solved issue, or qualified next step.
            </p>

            <div className="matrix-hero-actions">
              <a className="matrix-primary-button" href="#sandbox">
                Hear live agents
                <ArrowRight size={16} />
              </a>
              <a className="matrix-secondary-button" href="#sign-in">
                Enter platform
              </a>
            </div>

            <div className="matrix-pill-row">
              {statusPills.map((pill, index) => (
                <span key={pill} className={`matrix-status-pill tone-${index === 0 ? 'mint' : 'violet'}`}>
                  <span className="matrix-status-dot" />
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="matrix-hero-visual">
            <div className="matrix-hero-player-shell">
              <MatrixHeroPlayer className="matrix-hero-player" />
              <div className="matrix-hero-fabric" aria-hidden="true">
                <span>░░ BISHOP TECH VOICE // SIGNAL FABRIC // LIVE CALL FLOW ░░</span>
                <span>intent &gt; route &gt; answer &gt; booking &gt; follow-up</span>
                <span>faq graph / schedule path / crm memory / transcript loop</span>
              </div>
              <div className="matrix-hero-ribbon ribbon-cyan" aria-hidden="true" />
              <div className="matrix-hero-ribbon ribbon-violet" aria-hidden="true" />
              <div className="matrix-hero-ribbon ribbon-mint" aria-hidden="true" />

              <div className="matrix-hero-caption">
                <span>Live voice fabric</span>
                <strong>Animated ASCII signal art meets the call logic, transcript flow, and routing layer behind every conversation.</strong>
              </div>

              <div className="matrix-hero-overlay-stack">
                {heroVisualCards.map((card) => (
                  <article key={card.label} className={`matrix-hero-overlay-card tone-${card.tone}`}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="matrix-trust-rail">
          {trustRail.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>

        <section className="matrix-section" id="matrix">
          <div className="matrix-section-head">
            <div>
              <h2>
                Voice flows for <span>real teams.</span>
              </h2>
              <p>Choose the conversation pattern you need, then tune it to the offers, objections, and handoffs that matter to your business.</p>
            </div>

            <div className="matrix-tab-row">
              <button className="is-active" type="button">
                SALES
              </button>
              <button type="button">SUPPORT</button>
              <button type="button">QUALIFICATION</button>
            </div>
          </div>

          <div className="matrix-card-grid">
            {matrixCards.map((card) => {
              const Icon = card.icon;

              return (
                <article key={card.title} className={`matrix-feature-card tone-${card.tone}`}>
                  <div className="matrix-feature-meta">
                    <span className="matrix-feature-icon">
                      <Icon size={20} />
                    </span>
                    <span>{card.code}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <ul>
                    {card.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="matrix-signal-section">
          <div className="matrix-media-card">
            <CommandDeckPlayer className="matrix-deck-player" accent="mint" />
            <div className="matrix-media-fabric" aria-hidden="true">
              <span>voice mesh // tool chain // transcript pulse</span>
              <span>bookings / follow-up / human handoff / crm sync</span>
            </div>
            <div className="matrix-media-ascii" aria-hidden="true">
              <span>VOICE MATCH // TRANSCRIPTS // AUTOMATIONS</span>
              <span>ASCII SIGNAL FABRIC RUNNING ACROSS EVERY TURN</span>
            </div>
            <div className="matrix-media-footer">
              <span>Conversation pulse: live</span>
              <span>Ready for routing, booking, and follow-up</span>
            </div>
            <div className="matrix-progress-line" />
          </div>

          <div className="matrix-copy-stack">
            <h2>
              Conversations that <span>actually move.</span>
            </h2>
            <div className="matrix-detail-list">
              {deconstructionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className="matrix-detail-item">
                    <span className={`matrix-detail-icon tone-${item.tone}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="matrix-terminal-section" id="terminal">
          <div className="matrix-terminal-frame">
            <div className="matrix-terminal-topbar">
              <div className="matrix-terminal-lights">
                <span />
                <span />
                <span />
              </div>
              <span>LIVE CALL ENGINE // BISHOP TECH</span>
            </div>

            <MatrixTerminalPlayer
              className="matrix-terminal-player-shell"
              title="Every live call stays in motion."
              lines={terminalLines}
            />
            <div className="matrix-terminal-fabric" aria-hidden="true">
              <span>LISTENING // REASONING // ROUTING // SAVING NEXT STEPS</span>
              <span>░░ transcript current / workflow pulse / follow-up sync ░░</span>
            </div>
          </div>

          <div className="matrix-terminal-insights" id="security">
            <article className="matrix-terminal-insight-card">
              <span>Trust</span>
              <strong>Role-based access, transcript controls, and workspace separation built in.</strong>
            </article>
            <article className="matrix-terminal-insight-card">
              <span>Reliability</span>
              <strong>Fallback logic, handoff paths, and human review keep the experience steady.</strong>
            </article>
            <article className="matrix-terminal-insight-card">
              <span>Visibility</span>
              <strong>Calls, outcomes, and follow-up actions stay visible across the dashboard in real time.</strong>
            </article>
          </div>
        </section>

        <section className="matrix-section" id="sandbox">
          <div className="matrix-section-head is-stack">
            <div>
              <h2>
                Hear the difference <span>before you buy.</span>
              </h2>
              <p>Let prospects test live personas in the browser and hear how your voice agents sound across inbound and outbound scenarios.</p>
            </div>
          </div>

          <HomepagePersonaLab publicKey={appConfig.vapi.publicKey} personas={homepagePersonas} />
        </section>

        <section className="matrix-section">
          <div className="matrix-section-head is-stack">
            <div>
              <h2>
                Built for the calls <span>that matter.</span>
              </h2>
              <p>From revenue calls to support tickets, the platform is organized around business outcomes instead of generic AI feature lists.</p>
            </div>
          </div>

          <div className="matrix-outcome-grid">
            {useCaseCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="matrix-outcome-card">
                  <span className="matrix-feature-icon">
                    <Icon size={18} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="matrix-cta-section" id="sign-in">
          <div className="matrix-cta-copy">
            <span className="matrix-kicker">Start the conversation</span>
            <h2>Launch a Bishop Tech voice workspace built around your team.</h2>
            <p>
              Sign in if you already have access, or use the live demo experience to scope the right call flows,
              follow-up logic, and reporting setup for your business.
            </p>
            <div className="matrix-inline-badges">
              <span>Inbound + outbound orchestration</span>
              <span>Booking and routing logic</span>
              <span>Transcripts and call analytics</span>
            </div>
          </div>

          <form className="matrix-login-card" action={loginAction}>
            <div className="matrix-login-head">
              <span className="matrix-kicker">Workspace access</span>
              <LockKeyhole size={18} />
            </div>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="you@company.com" required disabled={!authConfigured} />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" placeholder="Enter your password" required disabled={!authConfigured} />
            </label>
            <button className="matrix-primary-button matrix-button-full" type="submit" disabled={!authConfigured}>
              {authConfigured ? 'Enter platform' : 'Auth not configured'}
            </button>

            {!authConfigured ? (
              <p className="notice">
                Sign-in is disabled until the Supabase environment variables are added to Vercel for this project.
              </p>
            ) : null}
            {errorMessage ? <p className="notice error-notice">{errorMessage}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
