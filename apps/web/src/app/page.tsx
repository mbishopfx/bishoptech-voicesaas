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

const statusPills = ['LATENCY: 140MS', 'TOKENS: 800K/S'];

const trustRail = ['OpenAI Realtime', 'Vapi orchestration', 'Prompt control', 'Transcript intelligence', '24/7 routing'];

const matrixCards = [
  {
    code: 'MOD_SALES_001',
    title: 'Closing Engine',
    description:
      'Dynamic objection handling and real-time payment processing integration for high-conversion voice flows.',
    bullets: ['Sentiment Mirroring', 'CRM Real-time Sync', 'Strike-Price Logic'],
    icon: PhoneCall,
    tone: 'cyan',
  },
  {
    code: 'MOD_SUPP_002',
    title: 'Empathy Core',
    description: 'Context-aware technical troubleshooting with the ability to navigate complex nested knowledge bases.',
    bullets: ['Intent Recognition', 'Human Handoff Bridge', 'Multi-step Resolution'],
    icon: Headphones,
    tone: 'violet',
  },
  {
    code: 'MOD_QUAL_003',
    title: 'Lead Sorter',
    description: 'Ultra-fast lead qualification using BANT or custom scoring frameworks within the first 30 seconds.',
    bullets: ['Zero-Latency Tagging', 'Prospect Profiling', 'Auto-Scheduling'],
    icon: Workflow,
    tone: 'mint',
  },
];

const deconstructionItems = [
  {
    title: 'Acoustic fingerprinting',
    body: 'Voiceprint-aware orchestration picks up cadence, urgency, and emotional drift before the assistant chooses a branch.',
    icon: MessagesSquare,
    tone: 'cyan',
  },
  {
    title: 'Biometric trust layers',
    body: 'Integrated validation layers make each voice interaction more trustworthy for regulated and high-value workflows.',
    icon: ShieldCheck,
    tone: 'violet',
  },
  {
    title: 'Universal transduction',
    body: 'Prompt logic, tools, transcripts, and knowledge layers stay synchronized across inbound and outbound motion.',
    icon: Sparkles,
    tone: 'mint',
  },
];

const encryptionLogs = [
  '> Initializing AES-256 Quantum Shield...',
  '> [SUCCESS] End-to-end tunneling active.',
  '> SOC2 Type II Compliance verified.',
  '> GDPR PII Redaction Layer: ON.',
];

const runtimeStats = [
  { label: 'TLS_HANDSHAKE', value: 'SECURE', tone: 'mint' },
  { label: 'LATENCY_STAB', value: '0.02MS', tone: 'cyan' },
  { label: 'PACKET_FRAG', value: '0% LOSS', tone: 'muted' },
  { label: 'AUTH_KEY_ROT', value: 'ACTIVE', tone: 'violet' },
];

const useCaseCards = [
  {
    title: 'Sales',
    body: 'Outbound qualification, objection handling, payment capture, and instant follow-up from the same agent framework.',
    icon: Send,
  },
  {
    title: 'Support',
    body: 'Tier-one troubleshooting, policy-aware guidance, escalation routing, and callback orchestration across live queues.',
    icon: Headphones,
  },
  {
    title: 'Qualification',
    body: 'Lead scoring, transcript tagging, CRM enrichment, and booking logic designed for fast operator review.',
    icon: ChartNoAxesCombined,
  },
];

const asciiFabric = `░░▒▒▓▓  SIGNAL_FABRIC // VOICE_MATRIX  ▓▓▒▒░░
┌────────────────────────────────────────────┐
│ MIC_INPUT  >>  INTENT_PARSE  >>  ROUTER    │
│ CRM_SYNC   >>  TOOL_CHAIN    >>  RESPONSE  │
└────────────────────────────────────────────┘
~~~╱╲~~~╱╲~~~╱╲~~~╱╲~~~╱╲~~~╱╲~~~╱╲~~~
<< living waveform / semantic current / control >>
0101 0011 1100   audio_in   audio_out   1010 0110`;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const viewer = await getViewerContext();

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
            <span className="matrix-kicker">PROTOCOL: MATRIX_V2</span>
            <h1>
              The Voice
              <span>Orchestrator.</span>
            </h1>
            <p>
              A cinematic synthesis of voice intelligence. Map, route, and execute complex agent behaviors through a
              unified liquid interface built for Bishop Tech&apos;s inbound, outbound, transcript, and orchestration
              stack.
            </p>

            <div className="matrix-hero-actions">
              <a className="matrix-primary-button" href="#sandbox">
                Open sandbox
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
            <div className="matrix-visual-core">
              <div className="matrix-mic-node">
                <PhoneCall size={22} />
              </div>
              <pre className="matrix-ascii-fabric" aria-hidden="true">
                {asciiFabric}
              </pre>
              <div className="matrix-wave-layer layer-cyan" />
              <div className="matrix-wave-layer layer-violet" />
              <div className="matrix-wave-layer layer-mint" />
            </div>

            <div className="matrix-logic-stack">
              <div className="matrix-logic-card tone-cyan">
                <span>LOGIC LAYER</span>
                <strong>LLM: GPT-4o-Audio</strong>
              </div>
              <div className="matrix-logic-card tone-violet">
                <span>KNOWLEDGE BASE</span>
                <strong>Vector: Pinecone-1</strong>
              </div>
              <div className="matrix-logic-card tone-mint">
                <span>SYNTHESIS</span>
                <strong>Model: ElevenLabs V2</strong>
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
                VERTICAL <span>MATRIX.</span>
              </h2>
              <p>Precision-engineered voice behaviors for mission-critical operations.</p>
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
            <div className="matrix-media-glow" />
            <div className="matrix-media-ascii" aria-hidden="true">
              <span>┌── SIGNAL ARRAY / BISHOPTECH / LIVE ──┐</span>
              <span>│ neural cache    voice mesh    intent │</span>
              <span>│ 011001         ▒▒▒▒▒▒▒▒       ↯↯↯↯   │</span>
              <span>└──────────────────────────────────────┘</span>
            </div>
            <div className="matrix-media-footer">
              <span>Signal Analysis: Active</span>
              <span>98.2% Accuracy</span>
            </div>
            <div className="matrix-progress-line" />
          </div>

          <div className="matrix-copy-stack">
            <h2>
              SIGNAL <span>DECONSTRUCTION.</span>
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
              <span>SECURE SHELL // ADMIN_ROOT</span>
            </div>

            <div className="matrix-terminal-grid">
              <div className="matrix-terminal-copy">
                <h2>ENCRYPTION PROTOCOLS.</h2>
                <div className="matrix-terminal-log">
                  {encryptionLogs.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <p className="matrix-terminal-note">
                  Our infrastructure sits within a &quot;Compliance Void&quot;: an isolated execution environment where
                  data exists only for the duration of the compute cycle before permanent scrub-down.
                </p>
              </div>

              <div className="matrix-runtime-card" id="security">
                <span className="matrix-runtime-label">SYSTEM_LOGS_REALTIME</span>
                <div className="matrix-runtime-stats">
                  {runtimeStats.map((stat) => (
                    <div key={stat.label} className="matrix-runtime-row">
                      <span>{stat.label}</span>
                      <strong className={`tone-${stat.tone}`}>{stat.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="matrix-runtime-bars" aria-hidden="true">
                  <span />
                  <span className="is-cyan" />
                  <span />
                  <span />
                  <span />
                  <span className="is-violet" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="matrix-section" id="sandbox">
          <div className="matrix-section-head is-stack">
            <div>
              <h2>
                COMMAND <span>SANDBOX.</span>
              </h2>
              <p>Live Vapi personas, transcript streaming, and browser-call testing inside the same brand system.</p>
            </div>
          </div>

          <HomepagePersonaLab publicKey={appConfig.vapi.publicKey} personas={homepagePersonas} />
        </section>

        <section className="matrix-section">
          <div className="matrix-section-head is-stack">
            <div>
              <h2>
                OUTCOME <span>MODULES.</span>
              </h2>
              <p>Use-case surfaces tuned for real operational outcomes rather than generic feature marketing.</p>
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
            <span className="matrix-kicker">PLATFORM ENTRY</span>
            <h2>Deploy the Bishop Tech voice matrix into a real workspace.</h2>
            <p>
              Sign in if you already have access, or use the sandbox and schedule a strategy call to scope the
              production system around your business.
            </p>
            <div className="matrix-inline-badges">
              <span>Inbound + outbound orchestration</span>
              <span>Workflow and prompt control</span>
              <span>Transcript and call analytics</span>
            </div>
          </div>

          <form className="matrix-login-card" action={loginAction}>
            <div className="matrix-login-head">
              <span className="matrix-kicker">AUTH_GATE</span>
              <LockKeyhole size={18} />
            </div>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="you@company.com" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" placeholder="Enter your password" required />
            </label>
            <button className="matrix-primary-button matrix-button-full" type="submit">
              Enter platform
            </button>

            {errorMessage ? <p className="notice error-notice">{errorMessage}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
