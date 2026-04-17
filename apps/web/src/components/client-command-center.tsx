import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Bot, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';

import { OutcomeBarChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import type { ClientDashboardData } from '@/lib/types';

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
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={actionHref as Route}>
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function ClientCommandCenter({ data }: { data: ClientDashboardData }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <Card key={metric.label} className="rounded-2xl border-border bg-card shadow-none">
            <CardContent className="space-y-2 px-5 py-5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
              <div className="text-2xl font-semibold tracking-[-0.04em]">{metric.value}</div>
              <p className="text-sm text-muted-foreground">{metric.delta}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-3xl border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl tracking-[-0.04em]">{data.organizationName}</CardTitle>
                <CardDescription className="mt-1">
                  Client-facing overview of pipeline, agent readiness, call quality, and demo confidence.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={data.vapiAccountMode === 'byo' ? 'warning' : 'success'}>
                  {data.vapiAccountMode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}
                </Badge>
                <Badge tone="cyan">{data.currentPack.label}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="rounded-2xl border border-border bg-background px-3 py-3">
              <PulseAreaChart recentCalls={data.recentCalls} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lead recovery</p>
                <p className="mt-2 text-xl font-semibold">{data.leadRecoveryRuns.filter((item) => item.status !== 'failed').length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Single-lead enrichments</p>
                <p className="mt-2 text-xl font-semibold">{data.leadEnrichmentRuns.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Playground sessions</p>
                <p className="mt-2 text-xl font-semibold">{data.recentDemoSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl tracking-[-0.03em]">Guardrails</CardTitle>
            <CardDescription>What you can control directly, and what remains operator-protected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-background px-4 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-200" />
                <p className="font-medium">Editable now</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Business context, tone, FAQ blocks, qualification fields, approved routing toggles, and test scenarios.</p>
            </div>
            {data.protectedBlocks.map((block) => (
              <div key={block} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                {block}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div>
          <SectionHeader
            eyebrow="Agent Studio"
            title="Guardrailed assistant stack"
            description="Review the active pack, current assistant versions, and what is safe for the client portal to modify."
            actionHref="/client/agents"
            actionLabel="Open Agent Studio"
          />
          <div className="grid gap-4">
            {data.agents.map((agent) => (
              <Card key={agent.id} className="rounded-3xl border-border bg-card shadow-none">
                <CardContent className="px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bot className="size-4 text-amber-200" />
                        <p className="font-medium">{agent.name}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{agent.purpose}</p>
                    </div>
                    <Badge tone={agent.syncStatus === 'synced' ? 'success' : agent.syncStatus === 'error' ? 'warning' : 'muted'}>
                      {agent.syncStatus ?? 'unknown'}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Voice</span>
                      <p className="mt-1 font-medium">{agent.voice}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Model</span>
                      <p className="mt-1 font-medium">{agent.model}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last sync</span>
                      <p className="mt-1 font-medium">{agent.lastSyncedAt}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border-border bg-card shadow-none">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-200" />
              <CardTitle className="text-xl tracking-[-0.03em]">Current ICP pack</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-5">
            <p className="text-sm leading-6 text-muted-foreground">{data.currentPack.positioning}</p>
            <div className="grid gap-3">
              {data.currentPack.leadSchema.requiredFields.map((field) => (
                <div key={field.key} className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="font-medium">{field.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeader
          eyebrow="Lead Pipeline"
          title="Recovered and enriched lead view"
          description="Every lead shows transcript context, fallback recovery status, enrichment state, and the next action the team can take."
          actionHref="/client/leads"
          actionLabel="Open lead pipeline"
        />
        <Card className="rounded-3xl border-border bg-card shadow-none">
          <CardContent className="px-0 py-0">
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-background">
                    <TableHead className="px-4">Lead</TableHead>
                    <TableHead>Recovery</TableHead>
                    <TableHead>Enrichment</TableHead>
                    <TableHead>Next action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leads.map((lead) => (
                    <TableRow key={lead.id} className="border-border">
                      <TableCell className="px-4">
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{lead.transcriptExcerpt}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge tone={lead.recoveryStatus === 'recovered' ? 'success' : lead.recoveryStatus === 'needs-review' ? 'warning' : 'muted'}>
                          {lead.recoveryStatus ?? 'structured'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge tone={lead.enrichmentStatus === 'completed' ? 'success' : lead.enrichmentStatus === 'failed' ? 'warning' : 'muted'}>
                          {lead.enrichmentStatus ?? 'not run'}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.nextAction ?? 'Review and route'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div>
          <SectionHeader
            eyebrow="Call Explorer"
            title="Transcript-backed call review"
            description="Review outcomes, transcript depth, and whether lead data was captured cleanly enough to promote into the pipeline."
            actionHref="/client/calls"
            actionLabel="Open call explorer"
          />
          <Card className="rounded-3xl border-border bg-card shadow-none">
            <CardContent className="rounded-2xl px-4 py-4">
              <OutcomeBarChart recentCalls={data.recentCalls} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {data.recentCalls.slice(0, 4).map((call) => (
            <Card key={call.id} className="rounded-3xl border-border bg-card shadow-none">
              <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{call.caller}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{call.summary}</p>
                  </div>
                  <Badge tone={call.leadRecoveryStatus === 'recovered' ? 'success' : call.leadRecoveryStatus === 'needs-review' ? 'warning' : 'muted'}>
                    {call.outcome}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="playground">
        <SectionHeader
          eyebrow="Playground"
          title="Client self-test calls"
          description="Run a guided test call to yourself, validate the current pack, and use replayable results to request revisions with proof."
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="rounded-3xl border-border bg-card shadow-none">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl tracking-[-0.03em]">Scenario presets</CardTitle>
              <CardDescription>Each preset is aligned to the active ICP pack and exposes the signals the team expects to capture.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 py-5">
              {data.playgroundScenarios.slice(0, 4).map((scenario) => (
                <div key={scenario.id} className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{scenario.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{scenario.description}</p>
                    </div>
                    <Badge tone="cyan">{scenario.expectedSignals.length} signals</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border bg-card shadow-none">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-amber-200" />
                <CardTitle className="text-xl tracking-[-0.03em]">Recent sessions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5 py-5">
              {data.recentDemoSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{session.scenarioLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{session.targetPhoneNumber}</p>
                    </div>
                    <Badge tone={session.status === 'completed' ? 'success' : session.status === 'queued' ? 'warning' : 'muted'}>
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
