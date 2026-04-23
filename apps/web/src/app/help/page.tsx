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

const clientSteps = [
  {
    title: 'Start on the overview page',
    body: 'Use the overview page for a quick read on calls, new leads, assistant activity, and the current state of your workspace.',
    icon: HomeIcon,
  },
  {
    title: 'Review calls and leads',
    body: 'Use Calls and Leads to see what happened, what was captured, and which conversations need follow-up from your team.',
    icon: Component1Icon,
  },
  {
    title: 'Test and request changes',
    body: 'Use the Call Tester to listen to the experience, then submit a support request whenever you want changes or a working session.',
    icon: MixerHorizontalIcon,
  },
];

const clientRouteGuide = [
  { label: 'Overview', detail: 'Your top-level snapshot for activity, leads, and assistant coverage.' },
  { label: 'Assistants', detail: 'See the assistant experiences assigned to your workspace and review recent performance.' },
  { label: 'Calls', detail: 'Read transcripts, review summaries, and export recordings or transcripts when needed.' },
  { label: 'Leads', detail: 'Track newly captured contacts and see what follow-up is recommended next.' },
  { label: 'Campaigns', detail: 'Review saved or active outreach campaigns connected to your workspace.' },
  { label: 'Call Tester', detail: 'Run a browser-based test call to hear the current experience and capture feedback.' },
  { label: 'Support Requests', detail: 'Submit questions, change requests, issues, or meeting requests to the team.' },
  { label: 'Workspace Details', detail: 'Reference your current plan, timezone, phone coverage, and support resources.' },
];

const clientBestPractices = [
  'Use call history before requesting changes so your feedback is tied to real examples.',
  'Keep feedback specific: mention the scenario, the phrase that felt off, and the outcome you want instead.',
  'Use support requests for updates rather than trying to manage the assistant configuration directly.',
];

const adminCards = [
  {
    title: 'Owner platform',
    body: 'Use the admin workspace as the birds-eye surface for all clients, portfolio health, and open work.',
    icon: HomeIcon,
  },
  {
    title: 'Client-safe surfaces only',
    body: 'Keep provisioning, credentials, and deep assistant controls out of the client workspace.',
    icon: MixerHorizontalIcon,
  },
  {
    title: 'Centralize guidance here',
    body: 'Move durable how-to guidance into playbooks instead of leaving internal notes scattered through the app.',
    icon: RocketIcon,
  },
];

export default async function HelpPage() {
  const viewer = await requireViewer();
  const workspaceHref = viewer.isPlatformAdmin ? '/admin' : '/client';

  if (!viewer.isPlatformAdmin) {
    return (
      <AppShell
        current="help"
        viewer={viewer}
        activeNav="playbooks"
        eyebrow="Playbooks"
        title="How to use your workspace"
        description="Everything your team needs to navigate the platform, review activity, and request updates without digging through internal platform details."
        actions={
          <Button asChild size="lg">
            <Link href={workspaceHref}>
              <HomeIcon />
              Back to workspace
            </Link>
          </Button>
        }
      >
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <Card className="py-0">
            <CardHeader className="border-b border-border/70 pb-4">
              <Badge tone="muted" className="w-fit">Quick start</Badge>
              <CardTitle className="text-[1.75rem] tracking-[-0.04em]">What to do first</CardTitle>
              <CardDescription className="max-w-2xl leading-7">
                These are the fastest ways to get value from the workspace without needing any internal platform knowledge.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-3">
              {clientSteps.map((item) => {
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
              <Badge tone="success" className="w-fit">Best practices</Badge>
              <CardTitle>How to get the most from the platform</CardTitle>
              <CardDescription>Keep feedback clear and keep the workspace focused on review, testing, and action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {clientBestPractices.map((item) => (
                <div key={item} className="rounded-[22px] border border-border/70 bg-background/75 px-4 py-4 text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="py-0">
            <CardHeader className="border-b border-border/70 pb-4">
              <Badge tone="muted" className="w-fit">Navigation guide</Badge>
              <CardTitle>Where to go for each task</CardTitle>
              <CardDescription>Use the left menu as your main workspace map.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-4 py-4 md:grid-cols-2">
              {clientRouteGuide.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-border/70 bg-muted/25 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b border-border/70 pb-4">
              <Badge tone="cyan" className="w-fit">Need help?</Badge>
              <CardTitle>When to contact the team</CardTitle>
              <CardDescription>Use a support request whenever you need changes or want something reviewed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {[
                'Use a question request when you need clarity on what the workspace is showing.',
                'Use a revision request when the assistant wording, routing, or behavior needs to change.',
                'Use a meeting request when you want to review performance or plan the next round of updates.',
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-border/70 bg-background/75 px-4 py-4 text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      current="help"
      viewer={viewer}
      activeNav="playbooks"
      eyebrow="Playbooks"
      title="Owner and team playbooks"
      description="Use this space for the durable rules behind the platform, client-safe navigation, and the operating standards for the portfolio."
      actions={
        <Button asChild size="lg">
          <Link href={workspaceHref}>
            <HomeIcon />
            Back to owner platform
          </Link>
        </Button>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <Card className="py-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <Badge tone="muted" className="w-fit">Operating principles</Badge>
            <CardTitle className="text-[1.75rem] tracking-[-0.04em]">How the portfolio should be run</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              Keep client workspaces clear, keep admin controls centralized, and keep long-form guidance in playbooks instead of in the product UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-3">
            {adminCards.map((item) => {
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
            <Badge tone="cyan" className="w-fit">Navigation</Badge>
            <CardTitle>Three lanes only</CardTitle>
            <CardDescription>Keep the information architecture obvious for both your team and your clients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-4">
            {[
              { label: 'Owner platform', detail: 'Cross-client portfolio visibility, onboarding, provisioning, and deep controls.' },
              { label: 'Client workspace', detail: 'Calls, leads, campaigns, testing, requests, and account basics only.' },
              { label: 'Playbooks', detail: 'How-to guidance, usage notes, and standards for both audiences.' },
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
              <Badge tone="muted" className="mb-3 w-fit">Client playbooks</Badge>
              <CardTitle>What belongs in client-facing documentation</CardTitle>
              <CardDescription>Keep client documentation focused on navigation, review, testing, and support requests.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={workspaceHref}>
                <ReaderIcon />
                Open owner platform
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4">
          {[
            'How to review calls, transcripts, and recordings.',
            'How to track new leads and follow-up recommendations.',
            'How to test the experience in the call tester.',
            'How to submit change requests, questions, and meeting requests.',
          ].map((item) => (
            <div key={item} className="rounded-[24px] border border-border/70 bg-background/78 px-4 py-4 text-sm leading-7 text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
