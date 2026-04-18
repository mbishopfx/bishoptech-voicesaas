import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Bot, FileCheck2, RadioTower, Sparkles, Workflow } from 'lucide-react';

import { OrganizationLoadChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import type { AdminDashboardData } from '@/lib/types';

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div id={id} className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Button asChild variant="outline">
          <Link href={actionHref as Route}>
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function AdminCommandCenter({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.commandCenter.map((card) => (
          <Card key={card.label} className="border-border bg-card shadow-none">
            <CardContent className="space-y-2 px-5 py-5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">{card.label}</p>
              <div className="text-2xl font-semibold tracking-[-0.04em]">{card.value}</div>
              <p className="text-sm text-muted-foreground">{card.trend}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl tracking-[-0.04em]">Platform pulse</CardTitle>
            <CardDescription>Call traffic, transcript density, and conversation health across the managed portfolio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="rounded-md border border-border bg-background px-3 py-3">
              <PulseAreaChart recentCalls={data.recentCalls} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organizations</p>
                <p className="mt-2 text-xl font-semibold">{data.organizations.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recovery queue</p>
                <p className="mt-2 text-xl font-semibold">{data.recoveryQueue.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Demo sessions</p>
                <p className="mt-2 text-xl font-semibold">{data.demoSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl tracking-[-0.03em]">Operator focus</CardTitle>
            <CardDescription>What needs attention before you spin another live demo or push a client revision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-4">
            {data.recoveryQueue.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge tone={item.status === 'recovered' ? 'success' : item.status === 'needs-review' ? 'warning' : 'muted'}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Confidence {(item.confidence * 100).toFixed(0)}%</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="templates">
        <SectionHeader
          eyebrow="ICP Template Library"
          title="Four launch-ready vertical packs"
          description="Each pack carries its lead schema, grading rubric, voice preset, tool rules, and default demo scenarios."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.icpPacks.map((pack) => (
            <Card key={pack.id} className="border-border bg-card shadow-none">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl tracking-[-0.03em]">{pack.label}</CardTitle>
                    <CardDescription className="mt-1">{pack.summary}</CardDescription>
                  </div>
                  <Badge tone="cyan">{pack.vertical}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-5 py-5">
                <p className="text-sm leading-6 text-muted-foreground">{pack.positioning}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Required fields</p>
                    <p className="mt-2 text-lg font-semibold">{pack.leadSchema.requiredFields.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{pack.leadSchema.requiredFields.map((field) => field.label).join(', ')}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Voice preset</p>
                    <p className="mt-2 text-lg font-semibold">{pack.voicePreset.voiceId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{pack.voicePreset.style}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {pack.testScenarios.map((scenario) => (
                    <div key={scenario.id} className="rounded-md border border-border bg-background px-4 py-3">
                      <p className="font-medium">{scenario.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{scenario.expectedOutcome}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="factory" className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div>
          <SectionHeader
            eyebrow="Assistant Factory"
            title="Versioned stack creation"
            description="Provision a managed stack from the right ICP pack, publish it to Vapi, and keep revision history visible."
            actionHref="/admin/onboarding"
            actionLabel="Open onboarding studio"
          />
          <Card className="border-border bg-card shadow-none">
            <CardContent className="px-0 py-0">
              <TableWrap>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-background">
                      <TableHead className="px-4">Assistant</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Pack</TableHead>
                      <TableHead>Changed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assistantVersions.map((version) => (
                      <TableRow key={version.id} className="border-border">
                        <TableCell className="px-4">
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background">
                              <Workflow className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium">{version.summary}</p>
                              <p className="text-xs text-muted-foreground">{version.changedBy}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{version.versionLabel}</TableCell>
                        <TableCell>{data.icpPacks.find((pack) => pack.id === version.icpPackId)?.label ?? version.icpPackId}</TableCell>
                        <TableCell>{version.changedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-amber-200" />
              <CardTitle className="text-xl tracking-[-0.03em]">Factory defaults</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-5 text-sm text-muted-foreground">
            <p>Managed Vapi is the default path for demos and rapid revisions.</p>
            <p>Each stack should reserve a free number, attach the ICP pack metadata, and publish only after the guardrails are baked in.</p>
            <p>Client editing remains limited to approved blocks even after the stack is published.</p>
          </CardContent>
        </Card>
      </section>

      <section id="numbers" className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div>
          <SectionHeader
            eyebrow="Number Pool"
            title="Managed demo inventory"
            description="Track which numbers are free, reserved, assigned, or cooling down so live demos never step on each other."
          />
          <Card className="border-border bg-card shadow-none">
            <CardContent className="px-0 py-0">
              <TableWrap>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-background">
                      <TableHead className="px-4">Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Window</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.numberPool.map((entry) => (
                      <TableRow key={entry.id} className="border-border">
                        <TableCell className="px-4">
                          <div>
                            <p className="font-medium">{entry.phoneNumber}</p>
                            <p className="text-xs text-muted-foreground">{entry.label}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={entry.status === 'free' ? 'success' : entry.status === 'cooldown' ? 'warning' : 'cyan'}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.assignedTo ?? 'Unassigned'}</TableCell>
                        <TableCell>{entry.reservationEndsAt ?? entry.lastUsedAt ?? 'Open'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <RadioTower className="size-4 text-amber-200" />
              <CardTitle className="text-xl tracking-[-0.03em]">Pool health</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-5">
            <div className="rounded-md border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Free lines</p>
              <p className="mt-2 text-2xl font-semibold">{data.numberPoolHealth.free}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
              <p className="mt-2 text-2xl font-semibold">{data.numberPoolHealth.assigned}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cooldown</p>
              <p className="mt-2 text-2xl font-semibold">{data.numberPoolHealth.cooldown}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="recovery" className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div>
          <SectionHeader
            eyebrow="Failure Recovery + QA"
            title="Conversation review queue"
            description="Surface calls that lost structured output, need QA grading, or require transcript-based recovery before they hit the lead pipeline."
            actionHref="/admin/calls"
            actionLabel="Open call queue"
          />
          <Card className="border-border bg-card shadow-none">
            <CardContent className="px-5 py-5">
              <div className="rounded-md border border-border bg-background px-3 py-3">
                <OrganizationLoadChart organizations={data.organizations} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {data.recoveryQueue.map((item) => (
            <Card key={item.id} className="border-border bg-card shadow-none">
              <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge tone={item.status === 'recovered' ? 'success' : item.status === 'needs-review' ? 'warning' : 'muted'}>
                    {item.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Docs + Playbooks"
          title="Operator runbooks"
          description="Keep the revenue engine repeatable: demo spin-up, ICP revision, lead recovery, and client-safe testing all documented in one place."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.playbooks.map((playbook) => (
            <Card key={playbook.id} className="border-border bg-card shadow-none">
              <CardContent className="space-y-3 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{playbook.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{playbook.summary}</p>
                  </div>
                  <Badge tone={playbook.audience === 'operator' ? 'cyan' : playbook.audience === 'client' ? 'success' : 'muted'}>
                    {playbook.audience}
                  </Badge>
                </div>
                <Button asChild variant="outline">
                  <Link href={playbook.href as Route}>
                    Open doc
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
