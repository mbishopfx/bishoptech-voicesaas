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
      delta: `${data.agents.filter((agent) => agent.status === 'live' || agent.status === 'ready').length} available now`,
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
          <TabsTrigger value="logs">Call history</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{data.organizationName}</CardTitle>
              <CardDescription>Calls, leads, campaigns, and assistant performance in one shared workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PulseAreaChart recentCalls={data.recentCalls} />
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plan</p>
                  <p className="mt-2 text-2xl font-semibold">{data.planName ?? 'Active'}</p>
                  <p className="text-sm text-muted-foreground">Workspace subscription</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phone lines</p>
                  <p className="mt-2 text-2xl font-semibold">{data.phoneNumbers.length}</p>
                  <p className="text-sm text-muted-foreground">Connected calling lines</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timezone</p>
                  <p className="mt-2 text-2xl font-semibold">{data.timezone}</p>
                  <p className="text-sm text-muted-foreground">Primary scheduling timezone</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent calls</CardTitle>
                <CardDescription>The latest logged conversations in this workspace.</CardDescription>
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

            <div className="grid gap-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Assistant lineup</CardTitle>
                  <CardDescription>The assistant experiences currently available to your team.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PanelList
                    items={assistantRows.map((agent, index) => ({
                      title: agent ? agent.name : ['Inbound assistant', 'Outbound assistant', 'Campaign assistant'][index],
                      description: agent?.purpose ?? 'This assistant is not configured yet.',
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileAudio2 className="size-4" />
                    Downloads
                  </CardTitle>
                  <CardDescription>Use call history to export transcripts or recordings when you need them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PanelList
                    items={[
                      { title: 'Recordings', description: 'Download call recordings from the call history view whenever an audio file is available.' },
                      { title: 'Transcripts', description: 'Export transcripts directly from the call history view.' },
                      { title: 'Lead details', description: 'Captured contact details remain attached to each conversation and lead record.' },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assistants" className="space-y-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Assistants</CardTitle>
                <CardDescription>The assistants currently assigned to this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Assistant</TableHead>
                        <TableHead>Focus</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Voice</TableHead>
                        <TableHead>Updated</TableHead>
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
                          <TableCell>{agent.status === 'live' ? 'Live coverage' : agent.status === 'ready' ? 'Ready to review' : 'In setup'}</TableCell>
                          <TableCell>{agent.role}</TableCell>
                          <TableCell>{agent.voice}</TableCell>
                          <TableCell>{agent.lastSyncedAt}</TableCell>
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
                  Featured assistants
                </CardTitle>
                <CardDescription>The primary assistant assigned for each workflow lane.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PanelList
                  items={assistantRows.map((agent, index) => ({
                    title: agent?.name ?? ['Inbound', 'Outbound', 'Campaign'][index],
                    description: agent?.purpose ?? 'This assistant is not configured yet.',
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
                <CardDescription>Captured contacts with current status and the next suggested step.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Lead</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Research</TableHead>
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
                              {lead.recoveryStatus ?? 'captured'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge tone={lead.enrichmentStatus === 'completed' ? 'success' : lead.enrichmentStatus === 'failed' ? 'warning' : 'muted'}>
                              {lead.enrichmentStatus ?? 'not started'}
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
                <CardTitle className="text-base">Lead activity</CardTitle>
                <CardDescription>A quick summary of recent lead handling in this workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <PanelList
                  items={[
                    {
                      title: 'Captured leads',
                      description: `${data.leadRecoveryRuns.filter((item) => item.status !== 'failed').length} recent follow-up records were preserved from calls.`,
                    },
                    {
                      title: 'Research activity',
                      description: `${data.leadEnrichmentRuns.length} research runs were saved from the lead table.`,
                    },
                    {
                      title: 'Phone lines',
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
                <CardTitle>Call results</CardTitle>
                <CardDescription>Recent call outcomes and trend lines for this workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <OutcomeBarChart recentCalls={data.recentCalls} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PhoneCall className="size-4" />
                  Recent calls
                </CardTitle>
                <CardDescription>Open call history whenever you need a full transcript or recording.</CardDescription>
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
