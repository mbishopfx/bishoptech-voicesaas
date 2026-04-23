import { Bot, FileAudio2, PhoneCall } from 'lucide-react';

import { OutcomeBarChart, PulseAreaChart } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientDashboardData } from '@/lib/types';

function MetricCards({ data }: { data: ClientDashboardData }) {
  const cards = [
    {
      label: 'Lead captures',
      value: String(data.leads.length),
      delta: data.leads[0] ? `Last updated ${data.leads[0].createdAt}` : 'No captured leads',
    },
    {
      label: 'Assistants',
      value: String(data.agents.length),
      delta: `${data.agents.filter((agent) => agent.vapiAssistantId).length} provisioned IDs`,
    },
    {
      label: 'Call logs',
      value: String(data.recentCalls.length),
      delta: data.recentCalls[0] ? `Last call ${data.recentCalls[0].createdAt}` : 'No recent calls',
    },
    {
      label: 'Campaigns',
      value: String(data.campaigns.length),
      delta: `${data.campaigns.filter((campaign) => campaign.status === 'active').length} active`,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((metric) => (
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
  const assistantRows = ['inbound', 'outbound', 'campaign'].map((role) => data.agents.find((agent) => agent.role === role));

  return (
    <div className="space-y-6">
      <MetricCards data={data} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assistants">Assistants</TabsTrigger>
          <TabsTrigger value="leads">Lead captures</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.9fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>{data.organizationName}</CardTitle>
                <CardDescription>Assistants, leads, calls, and campaign status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PulseAreaChart recentCalls={data.recentCalls} />
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
                    <p className="mt-2 text-2xl font-semibold">{data.vapiAccountMode === 'byo' ? 'BYO' : 'Managed'}</p>
                    <p className="text-sm text-muted-foreground">Current Vapi ownership</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Numbers</p>
                    <p className="mt-2 text-2xl font-semibold">{data.phoneNumbers.length}</p>
                    <p className="text-sm text-muted-foreground">Connected phone lines</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pack</p>
                    <p className="mt-2 text-2xl font-semibold">{data.currentPack.label}</p>
                    <p className="text-sm text-muted-foreground">Current workflow template</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Assistant IDs</CardTitle>
                <CardDescription>Provisioned assistant profiles for this workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={assistantRows.map((agent, index) => ({
                    title: agent ? `${agent.role} assistant` : ['inbound', 'outbound', 'campaign'][index],
                    description: agent?.vapiAssistantId ?? 'Not provisioned yet',
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent calls</CardTitle>
                <CardDescription>Latest logged call activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recentCalls.slice(0, 5).map((call) => ({
                    title: call.caller,
                    description: `${call.createdAt} • ${call.summary}`,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileAudio2 className="size-4" />
                  Exports
                </CardTitle>
                <CardDescription>Audio and transcript exports live in call logs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PanelList
                  items={[
                    { title: 'Audio files', description: 'Download WAV or MP3 from individual call records when available.' },
                    { title: 'Transcripts', description: 'Export transcripts directly from the call log viewer.' },
                    { title: 'Structured data', description: 'Lead captures and recovery state stay attached to each call and contact.' },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assistants" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Assistant IDs</CardTitle>
                <CardDescription>Inbound, outbound, and campaign profiles.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Assistant</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Voice</TableHead>
                        <TableHead>Model</TableHead>
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
                          <TableCell className="font-mono text-xs">{agent.vapiAssistantId ?? 'pending'}</TableCell>
                          <TableCell>{agent.role}</TableCell>
                          <TableCell>{agent.voice}</TableCell>
                          <TableCell>{agent.model}</TableCell>
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
                  Primary profiles
                </CardTitle>
                <CardDescription>Role-specific assistant assignment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PanelList
                  items={assistantRows.map((agent, index) => ({
                    title: agent?.name ?? ['Inbound', 'Outbound', 'Campaign'][index],
                    description: agent?.vapiAssistantId ?? 'Not provisioned yet',
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.7fr)_320px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Lead captures</CardTitle>
                <CardDescription>Recovered contacts with capture status and next action.</CardDescription>
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
                <CardTitle className="text-base">Lead status</CardTitle>
                <CardDescription>Capture and enrichment totals.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Recovered leads',
                      description: `${data.leadRecoveryRuns.filter((item) => item.status !== 'failed').length} fallback runs preserved lead data.`,
                    },
                    {
                      title: 'Enrichment runs',
                      description: `${data.leadEnrichmentRuns.length} manual scans recorded from the lead table.`,
                    },
                    {
                      title: 'Phone numbers',
                      description: `${data.phoneNumbers.length} active numbers attached to the workspace.`,
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Call logs</CardTitle>
                <CardDescription>Recent log outcomes and export-ready records.</CardDescription>
              </CardHeader>
              <CardContent>
                <OutcomeBarChart recentCalls={data.recentCalls} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PhoneCall className="size-4" />
                  Recent logs
                </CardTitle>
                <CardDescription>Open the call log page to export transcript or audio.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={data.recentCalls.slice(0, 6).map((call) => ({
                    title: call.caller,
                    description: `${call.createdAt} • ${call.outcome}`,
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
