'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { FileSpreadsheet, Send, TriangleAlert, Upload, Users } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { parseBlastCsv } from '@/lib/csv';
import type { BlastCampaignResult, DashboardAgent } from '@/lib/types';

type BlastCampaignStudioProps = {
  organizationId: string;
  agents: DashboardAgent[];
};

function StudioKpi({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
      <CardContent className="space-y-1 px-4 py-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function BlastCampaignStudio({ organizationId, agents }: BlastCampaignStudioProps) {
  const availableAgents = agents.filter((agent) => agent.role === 'campaign' || agent.role === 'specialist');
  const agentPool = availableAgents;
  const initialAgentId = agentPool[0]?.id ?? '';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState(initialAgentId);
  const [script, setScript] = useState('');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<BlastCampaignResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedAssistant = agentPool.find((agent) => agent.id === selectedAssistantId) ?? agentPool[0] ?? null;
  const preview = useMemo(() => parseBlastCsv(csvText), [csvText]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StudioKpi
          label="Assigned agent"
          value={selectedAssistant?.name ?? 'None'}
          description={selectedAssistant ? `${selectedAssistant.voice} • ${selectedAssistant.model}` : 'Assign a campaign assistant first.'}
        />
        <StudioKpi
          label="Accepted"
          value={String(preview.validRecipients.length)}
          description="Recipients that passed CSV normalization and can be queued."
        />
        <StudioKpi
          label="Rejected"
          value={String(preview.rejectedRows.length)}
          description="Rows that need cleanup before launch."
        />
        <StudioKpi
          label="Mode"
          value={result?.mode ?? 'draft'}
          description="Queues after validation."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="py-0">
          <CardHeader className="border-b pb-5">
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Outbound campaign</p>
              <CardTitle>Campaign assistant</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">Use the dedicated campaign assistant ID for script-based broadcasts.</CardDescription>
            </div>
            <CardAction className="text-xs font-mono text-muted-foreground">
              {selectedAssistant?.vapiAssistantId ?? 'No assistant ID'}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Campaign name</span>
                <Input
                  value={campaignName}
                  placeholder="Spring reactivation sweep"
                  onChange={(event) => setCampaignName(event.target.value)}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Campaign assistant</span>
                <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId} disabled={!agentPool.length}>
                  <SelectTrigger className="h-10 w-full border-border/80 bg-background">
                    <SelectValue placeholder="Select a campaign assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentPool.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Campaign script</span>
              <Textarea
                rows={5}
                value={script}
                placeholder="Write the campaign script. This becomes the launch template for the campaign assistant."
                onChange={(event) => setScript(event.target.value)}
                className="min-h-[136px] border-border/80 bg-background"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recipient CSV</span>
              <Textarea
                rows={12}
                value={csvText}
                placeholder={'name,phone\nJane Smith,(214) 555-0147\nMarcus Lee,972-555-0112'}
                onChange={(event) => setCsvText(event.target.value)}
                className="min-h-[260px] border-border/80 bg-background font-mono text-[0.82rem]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/70 bg-muted/20 px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    setCsvText(typeof reader.result === 'string' ? reader.result : '');
                  };
                  reader.readAsText(file);
                }}
              />

              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload data-icon="inline-start" />
                Upload CSV
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCsvText('')}>
                Clear CSV
              </Button>
              <div className="text-xs leading-5 text-muted-foreground">
                Use columns like <span className="font-medium text-foreground">name</span> and <span className="font-medium text-foreground">phone</span>. Numbers are normalized before queueing.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="rounded-md"
                disabled={isPending || !selectedAssistant}
                onClick={() => {
                  if (!selectedAssistant) {
                    setError('This organization does not have a campaign assistant yet.');
                    return;
                  }

                  setError('');
                  startTransition(async () => {
                    const response = await fetch('/api/blast-campaign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        organizationId,
                        campaignName,
                        csvText,
                        script,
                        assistantId: selectedAssistant.id,
                      }),
                    });

                    const payload = (await response.json()) as BlastCampaignResult & { error?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Blast campaign failed to launch.');
                      return;
                    }

                    setResult(payload);
                  });
                }}
              >
                <Send data-icon="inline-start" />
                {isPending ? 'Queueing campaign...' : 'Queue blast campaign'}
              </Button>

              <div className="text-xs leading-5 text-muted-foreground">
                The script is applied to the campaign assistant template at launch.
              </div>
            </div>

            {error ? (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <TriangleAlert className="size-4" />
                <AlertTitle>Campaign rejected</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {result ? (
              <Alert className="border-emerald-500/20 bg-emerald-500/6 text-emerald-100">
                <Send className="size-4" />
                <AlertTitle>{result.campaignName}</AlertTitle>
                <AlertDescription>
                  Accepted {result.recipientsAccepted} recipients and rejected {result.recipientsRejected}.{` `}
                  {result.warnings.length ? result.warnings.join(' ') : 'The worker will dispatch the accepted calls in the background.'}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="py-0">
            <CardHeader className="border-b pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Launch checks</p>
                <CardTitle>Preflight</CardTitle>
                <CardDescription>Core requirements before the blast queue is accepted.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Campaign assistant</div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {selectedAssistant ? `${selectedAssistant.name} is attached to this campaign.` : 'No campaign assistant is currently available.'}
                  </div>
                </div>
                <Badge tone={selectedAssistant ? 'success' : 'warning'}>{selectedAssistant ? 'Ready' : 'Blocked'}</Badge>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Recipient list</div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {preview.validRecipients.length
                      ? `${preview.validRecipients.length} recipients are normalized and ready for queueing.`
                      : 'Paste or upload a CSV before launch.'}
                  </div>
                </div>
                <Badge tone={preview.validRecipients.length ? 'success' : 'warning'}>
                  {preview.validRecipients.length ? 'Ready' : 'Blocked'}
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Script coverage</div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {script.trim()
                      ? 'A campaign script is attached to the launch template.'
                      : 'Add a campaign script so the assistant has an opening and CTA.'}
                  </div>
                </div>
                <Badge tone={script.trim() ? 'success' : 'warning'}>{script.trim() ? 'Ready' : 'Needs copy'}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Recipient preview</p>
                <CardTitle>Normalized rows</CardTitle>
                <CardDescription>Accepted contacts shown exactly as they will be queued.</CardDescription>
              </div>
              <CardAction className="flex gap-2">
                <Badge tone="success">{preview.validRecipients.length} valid</Badge>
                <Badge tone={preview.rejectedRows.length ? 'warning' : 'muted'}>
                  {preview.rejectedRows.length} rejected
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {preview.validRecipients.length ? (
                <ScrollArea className="h-[340px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Recipient</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="px-4 text-right">Row</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.validRecipients.map((recipient) => (
                        <TableRow key={`${recipient.phoneNumber}-${recipient.rowNumber}`}>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="size-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{recipient.name || 'Unnamed contact'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{recipient.phoneNumber}</TableCell>
                          <TableCell className="px-4 text-right text-muted-foreground">{recipient.rowNumber}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="px-4 py-4">
                  <EmptyState>Paste or upload a CSV to see normalized recipients.</EmptyState>
                </div>
              )}
            </CardContent>
          </Card>

          {preview.rejectedRows.length ? (
            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <div className="space-y-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Validation errors</p>
                  <CardTitle>Rejected rows</CardTitle>
                  <CardDescription>Fix these rows before launching the queue.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <ScrollArea className="h-[220px]">
                  <div className="space-y-2 pr-3">
                    {preview.rejectedRows.map((row) => (
                      <div
                        key={`${row.rowNumber}-${row.reason}`}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-3"
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-amber-200">
                          <FileSpreadsheet className="size-3.5" />
                          <span>Row {row.rowNumber}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground">{row.reason}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
