import { ArrowRight, LockKeyhole, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';

import { loginAction } from '@/app/auth/actions';
import { getViewerContext } from '@/lib/auth';
import { appConfig } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const trustCards = [
  {
    title: 'Secure workspace access',
    body: 'Log into the live operations layer for dashboards, transcripts, campaigns, and assistant controls.',
    icon: ShieldCheck,
  },
  {
    title: 'Operational visibility',
    body: 'Monitor calls, agent behavior, and account performance from the same Bishop Tech control plane.',
    icon: Settings2,
  },
  {
    title: 'Continuous improvement',
    body: 'The platform sits inside the same optimization cycle as your workshops, updates, and weekly notes.',
    icon: Sparkles,
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
    <main className="auth-shell">
      <div className="shell-orb shell-orb-primary" />
      <div className="shell-orb shell-orb-tertiary" />

      <div className="auth-grid">
        <section className="auth-stage">
          <div className="auth-copy">
            <span className="eyebrow-text">BishopTech Voice Platform</span>
            <h2>Login to the command center behind your voice workspace.</h2>
            <p>
              Use your workspace credentials to access live dashboards, active calls, transcripts, outbound campaigns,
              and the operating controls tied to your Bishop Tech deployment.
            </p>
          </div>

          <div className="auth-trust-grid">
            {trustCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="glass-card trust-card">
                  <span className="icon-chip">
                    <Icon size={18} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>

          <div className="auth-offer-grid">
            <article className="glass-card trust-card">
              <strong>$99/mo keeps the stack improving</strong>
              <p>Maintenance, platform fee, and optimization stay bundled instead of expanding into bloated retainers.</p>
            </article>
            <article className="glass-card trust-card">
              <strong>Weekly workshops included</strong>
              <p>We keep clients close to the product so the operating model improves with the market.</p>
            </article>
            <article className="glass-card trust-card">
              <strong>Need the public site?</strong>
              <p>
                <a className="matrix-secondary-button" href="https://bishoptech.dev" rel="noreferrer" target="_blank">
                  Visit BishopTech.dev
                </a>
              </p>
            </article>
          </div>
        </section>

        <section className="glass-card auth-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Workspace access</span>
              <h3>Enter platform</h3>
            </div>
            <LockKeyhole size={18} />
          </div>

          <form className="auth-form" action={loginAction}>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="you@company.com" required disabled={!authConfigured} />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" placeholder="Enter your password" required disabled={!authConfigured} />
            </label>
            <button className="matrix-primary-button matrix-button-full" type="submit" disabled={!authConfigured}>
              {authConfigured ? 'Login' : 'Auth not configured'}
              {authConfigured ? <ArrowRight size={16} /> : null}
            </button>
          </form>

          {!authConfigured ? (
            <p className="notice">
              Sign-in is disabled until the Supabase environment variables are added to Vercel for this project.
            </p>
          ) : null}
          {errorMessage ? <p className="notice error-notice">{errorMessage}</p> : null}
        </section>
      </div>
    </main>
  );
}
