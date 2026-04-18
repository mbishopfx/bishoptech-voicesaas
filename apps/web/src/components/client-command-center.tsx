import { Bot, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';

import { OutcomeBarChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientDashboardData } from '@/lib/types';

function MetricCards({ data }: { data: ClientDashboardData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {data.metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[0.68rem] uppercase tracking-[0.18em]">{metric.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{metric.delta}</CardContent>
        </Card>
      ))}
    </section>
  );
}

function PanelList({
  items,
}: {
  items: Array<{
    title: string;
    description: string;
    badge?: { label: string; tone?: 'default' | 'success' | 'warning' | 'muted' | 'cyan' };
  }>;
}) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={`${item.title}-${item.description}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
          {item.badge ? <Badge tone={item.badge.tone ?? 'muted'}>{item.badge.label}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

export function ClientCommandCenter({ data }: { data: ClientDashboardData }) {
  const recoveredLeadCount = data.leadRecoveryRuns.filter((item) => item.status !== 'failed').length;
  const latestAgent = data.agents[0];

  return (
    <div className="space-y-6">
      <MetricCards data={data} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="studio">Agent Studio</TabsTrigger>
          <TabsTrigger value="pipeline">Lead Pipeline</TabsTrigger>
          <TabsTrigger value="calls">Call Explorer</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{data.organizationName}</CardTitle>
                    <CardDescription>
                      Pipeline health, recovered calls, and operator-controlled assistant status in one client-facing workspace.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={data.vapiAccountMode === 'byo' ? 'warning' : 'success'}>
                      {data.vapiAccountMode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}
                    </Badge>
                    <Badge tone="cyan">{data.currentPack.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <PulseAreaChart recentCalls={data.recentCalls} />
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lead recovery</p>
                    <p className="mt-2 text-2xl font-semibold">{recoveredLeadCount}</p>
                    <p className="text-sm text-muted-foreground">Structured fallback runs recorded</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Enrichment jobs</p>
                    <p className="mt-2 text-2xl font-semibold">{data.leadEnrichmentRuns.length}</p>
                    <p className="text-sm text-muted-foreground">Single-lead scans completed or queued</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Playground sessions</p>
                    <p className="mt-2 text-2xl font-semibold">{data.recentDemoSessions.length}</p>
                    <p className="text-sm text-muted-foreground">Client-run validation calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4" />
                  Guardrails
                </CardTitle>
                <CardDescription>Editable vs operator-protected system controls.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Editable now',
                      description:
                        'Business context, tone, FAQ blocks, qualification fields, approved routing toggles, and test scenarios.',
                      badge: { label: 'Client-safe', tone: 'success' },
                    },
                    ...data.protectedBlocks.map((block) => ({
                      title: block,
                      description: 'Protected by platform policy and operator review.',
                      badge: { label: 'Protected', tone: 'muted' as const },
                    })),
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent queue</CardTitle>
                <CardDescription>Latest calls and lead outcomes across the workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recentCalls.slice(0, 5).map((call) => ({
                    title: call.caller,
                    description: `${call.direction} • ${call.createdAt} • ${call.summary}`,
                    badge: { label: call.outcome, tone: 'muted' },
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4" />
                  Active pack
                </CardTitle>
                <CardDescription>Lead schema and ICP signals driving the workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{data.currentPack.positioning}</p>
                </div>
                <div className="space-y-3">
                  {data.currentPack.leadSchema.requiredFields.map((field) => (
                    <div key={field.key}>
                      <p className="font-medium">{field.label}</p>
                      <p className="text-sm text-muted-foreground">{field.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="studio" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Assistant stack</CardTitle>
                <CardDescription>Prompt, voice, model, and sync status surfaced like an actual operating dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Assistant</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Voice</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Sync</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="px-4">
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-xs text-muted-foreground">{agent.purpose}</p>
                            </div>
                          </TableCell>
                          <TableCell>{agent.role}</TableCell>
                          <TableCell>{agent.voice}</TableCell>
                          <TableCell>{agent.model}</TableCell>
                          <TableCell>
                            <Badge tone={agent.syncStatus === 'synced' ? 'success' : agent.syncStatus === 'error' ? 'warning' : 'muted'}>
                              {agent.syncStatus ?? 'unknown'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrap>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="size-4" />
                  Current live agent
                </CardTitle>
                <CardDescription>Primary client-facing assistant details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{latestAgent?.name ?? 'No live assistant'}</p>
                  <p className="text-sm text-muted-foreground">{latestAgent?.purpose ?? 'Assign an agent to begin.'}</p>
                </div>
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Voice</p>
                    <p className="mt-1 font-medium">{latestAgent?.voice ?? 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Model</p>
                    <p className="mt-1 font-medium">{latestAgent?.model ?? 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last sync</p>
                    <p className="mt-1 font-medium">{latestAgent?.lastSyncedAt ?? 'Not synced yet'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_320px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Recovered and enriched leads</CardTitle>
                <CardDescription>Transcript-backed lead records with recovery and enrichment state.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Lead</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Recovery</TableHead>
                        <TableHead>Enrichment</TableHead>
                        <TableHead>Next action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="px-4">
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.transcriptExcerpt}</p>
                            </div>
                          </TableCell>
                          <TableCell>{lead.service}</TableCell>
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

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Pipeline signals</CardTitle>
                <CardDescription>Counts the client can actually act on.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Recovered leads',
                      description: `${recoveredLeadCount} fallback runs preserved actionable lead data.`,
                      badge: { label: `${recoveredLeadCount}`, tone: 'success' },
                    },
                    {
                      title: 'Enrichment runs',
                      description: `${data.leadEnrichmentRuns.length} manual scans recorded from the lead table.`,
                      badge: { label: `${data.leadEnrichmentRuns.length}`, tone: 'cyan' },
                    },
                    {
                      title: 'Phone numbers',
                      description: `${data.phoneNumbers.length} active numbers attached to the workspace.`,
                      badge: { label: `${data.phoneNumbers.length}`, tone: 'muted' },
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Call outcomes</CardTitle>
                <CardDescription>Outcome distribution across the recent call window.</CardDescription>
              </CardHeader>
              <CardContent>
                <OutcomeBarChart recentCalls={data.recentCalls} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent call review</CardTitle>
                <CardDescription>Summaries with transcript-backed context.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recentCalls.slice(0, 6).map((call) => ({
                    title: call.caller,
                    description: `${call.summary} • ${call.createdAt}`,
                    badge: { label: call.outcome, tone: 'muted' },
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="playground" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Scenario presets</CardTitle>
                <CardDescription>Guided self-test flows aligned to the current ICP pack.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.playgroundScenarios.map((scenario) => ({
                    title: scenario.label,
                    description: scenario.description,
                    badge: { label: `${scenario.expectedSignals.length} signals`, tone: 'cyan' },
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="size-4" />
                  Recent sessions
                </CardTitle>
                <CardDescription>Replayable client test calls.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recentDemoSessions.map((session) => ({
                    title: session.scenarioLabel,
                    description: `${session.targetPhoneNumber} • ${session.createdAt}`,
                    badge: {
                      label: session.status,
                      tone: session.status === 'completed' ? 'success' : session.status === 'queued' ? 'warning' : 'muted',
                    },
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
