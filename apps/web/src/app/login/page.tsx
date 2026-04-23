import {
  ArrowRightIcon,
  CheckCircledIcon,
  Component1Icon,
  LockClosedIcon,
  RocketIcon,
} from '@radix-ui/react-icons';
import { redirect } from 'next/navigation';

import { loginAction } from '@/app/auth/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    body: 'Use one login to reach dashboards, transcripts, campaigns, and assistant controls.',
    icon: CheckCircledIcon,
  },
  {
    title: 'Operational visibility',
    body: 'Calls, lead capture, and assistant state stay in the same command layer.',
    icon: Component1Icon,
  },
  {
    title: 'Continuous iteration',
    body: 'The same workspace is used for launch, QA, and weekly optimization loops.',
    icon: RocketIcon,
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
    <main className="platform-auth-theme relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,59,47,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,59,47,0.10),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-[1440px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:px-8 lg:py-8">
        <section className="flex flex-col justify-between rounded-[34px] border border-border/70 bg-card/86 p-6 shadow-[0_30px_90px_-48px_rgba(17,24,39,0.24)] lg:p-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge tone="muted">BishopTech Voice Platform</Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-foreground md:text-5xl">
                  Login to the workspace running your voice operation.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                  Use your workspace credentials to review calls, transcripts, campaigns, lead recovery, and the assistant stack behind your deployment.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trustCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="rounded-[26px] border border-border/70 bg-background/72 px-4 py-4">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-card/85">
                      <Icon className="size-4" />
                    </div>
                    <h2 className="text-base font-semibold tracking-[-0.03em] text-foreground">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 pt-8 md:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-background/72 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Platform fee</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">$99 / month</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/72 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Launch motion</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">One setup fee</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/72 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Public site</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href="https://bishoptech.dev" rel="noreferrer" target="_blank">
                  Visit BishopTech.dev
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <Card className="w-full py-0">
            <CardHeader className="gap-3 border-b border-border/70 pb-5">
              <Badge tone="muted" className="w-fit">Workspace access</Badge>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-[1.8rem] tracking-[-0.05em]">Enter platform</CardTitle>
                  <CardDescription className="leading-7">
                    Sign in with the credentials tied to your workspace.
                  </CardDescription>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
                  <LockClosedIcon className="size-4" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-4 py-5">
              <form className="space-y-4" action={loginAction}>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Email</span>
                  <Input name="email" type="email" placeholder="you@company.com" required disabled={!authConfigured} className="h-11 rounded-2xl border-border/80 bg-background" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Password</span>
                  <Input name="password" type="password" placeholder="Enter your password" required disabled={!authConfigured} className="h-11 rounded-2xl border-border/80 bg-background" />
                </label>
                <Button type="submit" size="lg" className="w-full" disabled={!authConfigured}>
                  {authConfigured ? 'Login' : 'Auth not configured'}
                  {authConfigured ? <ArrowRightIcon /> : null}
                </Button>
              </form>

              {!authConfigured ? (
                <div className="rounded-[22px] border border-amber-600/20 bg-amber-500/[0.08] px-4 py-4 text-sm leading-7 text-amber-900">
                  Sign-in is disabled until the Supabase environment variables are configured for this deployment.
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-[22px] border border-red-600/15 bg-red-500/[0.08] px-4 py-4 text-sm leading-7 text-red-900">
                  {errorMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
