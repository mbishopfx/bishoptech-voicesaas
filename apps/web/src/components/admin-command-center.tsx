import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Bot, FileCheck2, RadioTower, Sparkles, Workflow } from 'lucide-react';

import {
  AdminBlueprintHistorySection,
  AdminRecentCallsSection,
  OrganizationLoadSection,
  OrganizationRosterSection,
} from '@/components/admin-dashboard-sections';
import { PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminDashboardData } from '@/lib/types';

function MetricCards({ data }: { data: AdminDashboardData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {data.commandCenter.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[0.68rem] uppercase tracking-[0.18em]">{metric.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{metric.trend}</CardContent>
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

export function AdminCommandCenter({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <MetricCards data={data} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packs">ICP Packs</TabsTrigger>
          <TabsTrigger value="factory">Assistant Factory</TabsTrigger>
          <TabsTrigger value="numbers">Number Pool</TabsTrigger>
          <TabsTrigger value="recovery">Recovery + QA</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
            <Card className="min-w-0 2xl:col-span-2">
              <CardHeader className="border-b">
                <CardTitle>Platform pulse</CardTitle>
                <CardDescription>
                  Managed portfolio health across call traffic, transcript density, recovery pressure, and demo readiness.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PulseAreaChart recentCalls={data.recentCalls} />
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organizations</p>
                    <p className="mt-2 text-2xl font-semibold">{data.organizations.length}</p>
                    <p className="text-sm text-muted-foreground">Active client workspaces</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recovery queue</p>
                    <p className="mt-2 text-2xl font-semibold">{data.recoveryQueue.length}</p>
                    <p className="text-sm text-muted-foreground">Calls requiring transcript fallback or QA</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Demo sessions</p>
                    <p className="mt-2 text-2xl font-semibold">{data.demoSessions.length}</p>
                    <p className="text-sm text-muted-foreground">Recent managed spin-up runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <OrganizationRosterSection
              organizations={data.organizations}
              limit={6}
              actionHref="/admin/clients"
              actionLabel="Open clients"
            />

            <div className="grid gap-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCheck2 className="size-4" />
                    Operator focus
                  </CardTitle>
                  <CardDescription>The live issues to resolve before the next client revision or demo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PanelList
                    items={data.recoveryQueue.slice(0, 5).map((item) => ({
                      title: item.title,
                      description: `${item.detail} • Confidence ${(item.confidence * 100).toFixed(0)}%`,
                      badge: {
                        label: item.status,
                        tone: item.status === 'recovered' ? 'success' : item.status === 'needs-review' ? 'warning' : 'muted',
                      },
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Command posture</CardTitle>
                  <CardDescription>Quick portfolio read before moving deeper into factory, numbers, or recovery.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PanelList
                    items={[
                      {
                        title: 'Managed capacity',
                        description: `${data.organizations.filter((organization) => organization.isActive).length} active workspaces with ${data.organizations.reduce((sum, organization) => sum + organization.liveAgentCount, 0)} live agents assigned right now.`,
                        badge: { label: 'Live', tone: 'success' },
                      },
                      {
                        title: 'Recovery visibility',
                        description: `${data.recoveryQueue.filter((item) => item.status === 'needs-review').length} calls need review and ${data.recoveryQueue.filter((item) => item.status === 'recovered').length} have already been recovered.`,
                        badge: { label: 'Queue', tone: 'warning' },
                      },
                      {
                        title: 'Demo readiness',
                        description: `${data.demoSessions.length} recent demo sessions and ${data.recentBlueprints.length} saved blueprints are ready for follow-up.`,
                        badge: { label: 'Ready', tone: 'cyan' },
                      },
                      {
                        title: 'Number inventory',
                        description: `${data.numberPoolHealth.assigned}/${data.numberPoolHealth.total} numbers are assigned with ${data.numberPoolHealth.free} free for the next launch.`,
                        badge: { label: 'Inventory', tone: 'muted' },
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <AdminRecentCallsSection
              recentCalls={data.recentCalls}
              limit={5}
              actionHref="/admin/calls"
              actionLabel="Open queue"
            />

            <OrganizationLoadSection organizations={data.organizations} limit={6} />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <AdminBlueprintHistorySection
              recentBlueprints={data.recentBlueprints}
              limit={4}
              actionHref="/admin/demo-lab"
              actionLabel="Open demo lab"
            />

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent playbooks</CardTitle>
                <CardDescription>Repeatable operations and client-safe docs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PanelList
                  items={data.playbooks.slice(0, 4).map((playbook) => ({
                    title: playbook.label,
                    description: playbook.summary,
                    badge: { label: playbook.audience, tone: playbook.audience === 'operator' ? 'cyan' : 'success' },
                  }))}
                />
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={'/help' as Route}>
                    Open playbooks
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.icpPacks.map((pack) => (
              <Card key={pack.id}>
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{pack.label}</CardTitle>
                      <CardDescription>{pack.summary}</CardDescription>
                    </div>
                    <Badge tone="cyan">{pack.vertical}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{pack.positioning}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Required fields</p>
                      <p className="mt-2 font-medium">{pack.leadSchema.requiredFields.map((field) => field.label).join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Voice preset</p>
                      <p className="mt-2 font-medium">{pack.voicePreset.voiceId}</p>
                      <p className="text-sm text-muted-foreground">{pack.voicePreset.style}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {pack.testScenarios.map((scenario) => (
                      <div key={scenario.id}>
                        <p className="font-medium">{scenario.label}</p>
                        <p className="text-sm text-muted-foreground">{scenario.expectedOutcome}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Versioned stack creation</CardTitle>
                <CardDescription>Draft vs published assistant revisions across the managed portfolio.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Assistant</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>ICP pack</TableHead>
                        <TableHead>Changed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.assistantVersions.map((version) => (
                        <TableRow key={version.id}>
                          <TableCell className="px-4">
                            <div className="flex items-start gap-3">
                              <div className="flex size-8 items-center justify-center rounded-md border bg-muted/30">
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

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="size-4" />
                  Factory defaults
                </CardTitle>
                <CardDescription>Safe defaults for revenue-friendly demo orchestration.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Managed Vapi first',
                      description: 'Default to managed numbers and managed credentials for demos and fast revisions.',
                      badge: { label: 'Default', tone: 'success' },
                    },
                    {
                      title: 'Attach ICP metadata',
                      description: 'Every stack should preserve schema, rubric, and tutorial context for later revisions.',
                      badge: { label: 'Required', tone: 'cyan' },
                    },
                    {
                      title: 'Guardrails before publish',
                      description: 'Client-facing edits stay limited even after the version is live.',
                      badge: { label: 'Protected', tone: 'muted' },
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="numbers" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_320px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Managed number inventory</CardTitle>
                <CardDescription>Free, reserved, assigned, and cooling lines for demos and client revisions.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Window</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.numberPool.map((entry) => (
                        <TableRow key={entry.id}>
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

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <RadioTower className="size-4" />
                  Pool health
                </CardTitle>
                <CardDescription>Availability snapshot across the demo fleet.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Free lines',
                      description: 'Immediately available for a new managed demo session.',
                      badge: { label: `${data.numberPoolHealth.free}`, tone: 'success' },
                    },
                    {
                      title: 'Assigned',
                      description: 'Currently reserved or attached to a live client workflow.',
                      badge: { label: `${data.numberPoolHealth.assigned}`, tone: 'cyan' },
                    },
                    {
                      title: 'Cooldown',
                      description: 'Waiting for reuse after recent demo activity.',
                      badge: { label: `${data.numberPoolHealth.cooldown}`, tone: 'warning' },
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Recovery queue</CardTitle>
                <CardDescription>Calls that lost structured output or need QA grading before entering the lead pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recoveryQueue.map((item) => ({
                    title: item.title,
                    description: `${item.detail} • ${(item.confidence * 100).toFixed(0)}% confidence`,
                    badge: {
                      label: item.status,
                      tone: item.status === 'recovered' ? 'success' : item.status === 'needs-review' ? 'warning' : 'muted',
                    },
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4" />
                  Demo sessions
                </CardTitle>
                <CardDescription>Recent managed demo spin-up activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.demoSessions.map((session) => ({
                    title: session.scenarioLabel,
                    description: `${session.targetPhoneNumber} • ${session.assignedNumberLabel}`,
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

        <TabsContent value="docs" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.playbooks.map((playbook) => (
              <Card key={playbook.id}>
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{playbook.label}</CardTitle>
                      <CardDescription>{playbook.summary}</CardDescription>
                    </div>
                    <Badge tone={playbook.audience === 'operator' ? 'cyan' : playbook.audience === 'client' ? 'success' : 'muted'}>
                      {playbook.audience}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full justify-between">
                    <Link href={playbook.href as Route}>
                      Open doc
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
