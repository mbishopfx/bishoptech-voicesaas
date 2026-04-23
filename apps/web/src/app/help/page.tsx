import Link from 'next/link';
import {
  Component1Icon,
  HomeIcon,
  MixerHorizontalIcon,
  ReaderIcon,
  RocketIcon,
} from '@radix-ui/react-icons';

import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireViewer } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const promptStarters = [
  'How should I configure after-hours missed-call recovery for this organization?',
  'Which client-safe settings can be exposed without risking agent drift?',
  'How should Vapi webhook payloads map to calls, contacts, and transcript assets?',
  'What is the cleanest handoff path from a demo assistant into a production org?',
];

const operatingCards = [
  {
    title: 'Kickoff call first',
    body: 'Sell and scope through a real onboarding call so routing, lead criteria, number ownership, and reporting expectations are locked before setup.',
    icon: RocketIcon,
  },
  {
    title: 'Client-safe controls only',
    body: 'Expose testing, logs, transcripts, and structured outputs on client pages while keeping drift-prone provisioning actions in operator lanes.',
    icon: MixerHorizontalIcon,
  },
  {
    title: 'Versioned assistant stacks',
    body: 'Inbound, outbound, and campaign assistants should stay explicit in the data model so publish and QA steps are predictable.',
    icon: Component1Icon,
  },
];

const routeRows = [
  {
    route: 'POST /api/demo-template',
    audience: 'Admin and client-authenticated users',
    detail: 'Generate and save a demo blueprint from website and GBP source material.',
  },
  {
    route: 'POST /api/demo-call',
    audience: 'Platform admin only',
    detail: 'Create a Vapi assistant and launch the outbound demo call.',
  },
  {
    route: 'POST /api/admin/onboard-client',
    audience: 'Platform admin only',
    detail: 'Create the client login, organization, memberships, and default assistant stack.',
  },
  {
    route: 'POST /api/blast-campaign',
    audience: 'Manage-org roles only',
    detail: 'Normalize recipients, queue a campaign, and persist recipient rows for follow-up.',
  },
];

export default async function HelpPage() {
  const viewer = await requireViewer();
  const workspaceHref = viewer.isPlatformAdmin ? '/admin' : '/client';

  return (
    <AppShell
      current="help"
      viewer={viewer}
      activeNav="playbooks"
      eyebrow="Playbooks"
      title="Operating notes, launch rules, and route contracts."
      description="Use this surface as the shared memory for provisioning logic, client-safe controls, and the route behavior behind the platform."
      actions={
        <Button asChild size="lg">
          <Link href={workspaceHref}>
            <HomeIcon />
            Back to workspace
          </Link>
        </Button>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card className="py-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <Badge tone="muted" className="w-fit">Operating model</Badge>
            <CardTitle className="text-[1.75rem] tracking-[-0.04em]">How the platform is meant to be run</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              These are the durable rules that keep onboarding, QA, publishing, and client visibility consistent across the portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-3">
            {operatingCards.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-[24px] border border-border/70 bg-muted/30 px-4 py-4">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-base font-semibold tracking-[-0.03em] text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <Badge tone="cyan" className="w-fit">Pricing</Badge>
            <CardTitle>Simple commercial model</CardTitle>
            <CardDescription>Keep the public-facing story direct and the delivery model sustainable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4">
            <div className="rounded-[24px] border border-border/70 bg-background/75 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Setup</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">One-time build fee</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Use the onboarding call to scope the real workflow before implementation starts.
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/75 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Management</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">$99 monthly</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Maintenance, tuning, weekly guidance, and platform access stay bundled instead of expanding into a bloated retainer.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="py-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <Badge tone="muted" className="w-fit">Prompt starters</Badge>
            <CardTitle>Questions worth answering inside the copilot</CardTitle>
            <CardDescription>Use these to seed rollout notes, assistant audits, and support handoff decisions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 py-4 md:grid-cols-2">
            {promptStarters.map((prompt) => (
              <div key={prompt} className="rounded-[22px] border border-border/70 bg-muted/25 px-4 py-4">
                <p className="text-sm font-medium leading-7 text-foreground">{prompt}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <Badge tone="success" className="w-fit">Navigation</Badge>
            <CardTitle>Where to work</CardTitle>
            <CardDescription>Use the same route language everywhere so support and operator flows stay obvious.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-4">
            {[
              { label: 'Admin', detail: 'Provisioning, inventory sync, onboarding, and demo tooling.' },
              { label: 'Client', detail: 'Calls, leads, campaigns, transcripts, and testing-safe controls.' },
              { label: 'Playbooks', detail: 'Route contracts, implementation notes, and launch guidance.' },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-border/70 bg-background/75 px-4 py-4">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="py-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge tone="muted" className="mb-3 w-fit">Route contracts</Badge>
              <CardTitle>Current API behavior</CardTitle>
              <CardDescription>These are the routes operators and client-safe tools depend on right now.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={workspaceHref}>
                <ReaderIcon />
                Open workspace
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4">
          {routeRows.map((row) => (
            <div
              key={row.route}
              className="grid gap-3 rounded-[24px] border border-border/70 bg-background/78 px-4 py-4 md:grid-cols-[minmax(0,1.25fr)_220px]"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{row.route}</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{row.detail}</p>
              </div>
              <div className="flex items-start md:justify-end">
                <Badge tone="muted">{row.audience}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
