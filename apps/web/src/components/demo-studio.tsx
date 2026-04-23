'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  Bot,
  DatabaseZap,
  ExternalLink,
  FileUp,
  Loader2,
  PhoneCall,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  DemoBlueprintSummary,
  DemoCallResult,
  DemoProspectorResult,
  DemoTemplateInput,
  OrchestrationMode,
} from '@/lib/types';

type ReleaseGateItem = {
  id: string;
  label: string;
  status: 'ready' | 'warning' | 'blocked';
  detail: string;
};

type DemoStudioProps = {
  organizationId?: string;
  recentBlueprints?: DemoBlueprintSummary[];
  releaseGate?: ReleaseGateItem[];
};

const initialFormState: DemoTemplateInput = {
  businessName: '',
  websiteUrl: '',
  googleBusinessProfile: '',
  goal: '',
  targetPhoneNumber: '',
  notes: '',
  orchestrationMode: 'multi',
};

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</span>;
}

function DemoKpi({
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

function statusTone(status?: DemoProspectorResult['status']) {
  switch (status) {
    case 'assistant_ready':
    case 'test_called':
      return 'success';
    case 'failed':
      return 'warning';
    default:
      return 'muted';
  }
}

function kbTone(status?: DemoProspectorResult['kbSyncStatus']) {
  return status === 'synced' ? 'success' : status === 'failed' ? 'warning' : 'muted';
}

export function DemoStudio({ organizationId, recentBlueprints = [], releaseGate = [] }: DemoStudioProps) {
  const [form, setForm] = useState<DemoTemplateInput>(initialFormState);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<DemoProspectorResult | null>(null);
  const [callResult, setCallResult] = useState<DemoCallResult | null>(null);
  const [error, setError] = useState('');
  const [statusLabel, setStatusLabel] = useState('Prospect intake is idle. Add source material and run the prospector.');
  const [isRunning, startRun] = useTransition();
  const [isSyncing, startSync] = useTransition();
  const [isCalling, startCall] = useTransition();

  function updateField<Key extends keyof DemoTemplateInput>(key: Key, value: DemoTemplateInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runProspector(modeLabel: string) {
    if (!organizationId) {
      setError('Select or attach a client workspace before running the demo prospector.');
      return;
    }

    setError('');
    setCallResult(null);
    setStatusLabel(modeLabel);

    startRun(async () => {
      const body = new FormData();
      body.set('organizationId', organizationId);
      body.set('businessName', form.businessName ?? '');
      body.set('websiteUrl', form.websiteUrl ?? '');
      body.set('googleBusinessProfile', form.googleBusinessProfile ?? '');
      body.set('goal', form.goal ?? '');
      body.set('targetPhoneNumber', form.targetPhoneNumber ?? '');
      body.set('notes', form.notes ?? '');
      body.set('orchestrationMode', form.orchestrationMode ?? 'multi');

      if (result?.persistedBlueprintId) {
        body.set('persistedBlueprintId', result.persistedBlueprintId);
      }

      for (const file of selectedFiles) {
        body.append('files', file);
      }

      const response = await fetch('/api/admin/demo-prospector/run', {
        method: 'POST',
        body,
      });
      const payload = (await response.json()) as DemoProspectorResult & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Unable to run the demo prospector.');
        return;
      }

      setResult(payload);
      setStatusLabel('Demo prospector finished. The blueprint, KB pack, and persisted assistant are ready to review.');
    });
  }

  const workflow = useMemo(
    () => [
      { label: 'Input', value: form.websiteUrl || form.googleBusinessProfile || selectedFiles.length ? 'Ready' : 'Pending' },
      { label: 'Generate', value: result ? (result.mode === 'live' ? 'Gemini' : 'Fallback') : isRunning ? 'Running' : 'Pending' },
      { label: 'Build KB', value: result?.knowledgePackSlug ? result.kbSyncStatus ?? 'Ready' : isRunning ? 'Building' : 'Pending' },
      { label: 'Persist', value: result?.vapiAssistantId ? 'Assistant ready' : isRunning ? 'Provisioning' : 'Pending' },
      { label: 'Test call', value: callResult ? 'Queued' : isCalling ? 'Launching' : 'Optional' },
    ],
    [callResult, form.googleBusinessProfile, form.websiteUrl, isCalling, isRunning, result, selectedFiles.length],
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DemoKpi label="Blueprints" value={String(recentBlueprints.length)} description="Persisted demo blueprints ready for reuse, resync, or client attach." />
        <DemoKpi label="Topology" value={form.orchestrationMode ?? 'multi'} description="Inbound, outbound, or multi-agent orchestration for this prospect." />
        <DemoKpi label="KB assets" value={String(result?.uploadedAssets?.length ?? selectedFiles.length)} description="Website pages, GBP notes, operator files, and generated pack content." />
        <DemoKpi label="Assistant" value={result?.vapiAssistantId ? 'Persisted' : isRunning ? 'Provisioning' : 'Pending'} description="The run creates or refreshes one reusable Vapi demo assistant." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
          <CardHeader className="gap-4 border-b border-border/70 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">Admin tool</Badge>
                <Badge tone="muted">Demo Prospector</Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-[-0.04em]">Input, crawl, generate, sync, call</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  Enter the website and GBP, add proof files, build the KB pack, sync Vapi-native RAG, persist the assistant, and optionally place a live demo call from the same workflow.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
            {!organizationId ? (
              <Alert variant="destructive">
                <AlertTitle>No active workspace</AlertTitle>
                <AlertDescription>The demo prospector needs an active client workspace to persist the blueprint, assistant, and assets.</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Business name</FieldLabel>
                <Input
                  value={form.businessName ?? ''}
                  placeholder="Northwind Dental"
                  onChange={(event) => updateField('businessName', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Agent topology</FieldLabel>
                <Select
                  value={form.orchestrationMode ?? 'multi'}
                  onValueChange={(value) => updateField('orchestrationMode', value as OrchestrationMode)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/80 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound agent</SelectItem>
                    <SelectItem value="outbound">Outbound agent</SelectItem>
                    <SelectItem value="multi">Multi-agent handoff</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Website URL</FieldLabel>
                <Input
                  value={form.websiteUrl ?? ''}
                  placeholder="https://example.com"
                  onChange={(event) => updateField('websiteUrl', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Google Business Profile text or URL</FieldLabel>
                <Textarea
                  rows={5}
                  value={form.googleBusinessProfile ?? ''}
                  placeholder="Paste the raw GBP text or drop in the profile URL."
                  onChange={(event) => updateField('googleBusinessProfile', event.target.value)}
                  className="rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Demo goal</FieldLabel>
                <Textarea
                  rows={4}
                  value={form.goal ?? ''}
                  placeholder="What should this demo prove for the business owner?"
                  onChange={(event) => updateField('goal', event.target.value)}
                  className="rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Target phone number</FieldLabel>
                <Input
                  value={form.targetPhoneNumber ?? ''}
                  placeholder="+12145550147"
                  onChange={(event) => updateField('targetPhoneNumber', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Operator notes</FieldLabel>
                <Input
                  value={form.notes ?? ''}
                  placeholder="Tone, objections, offer, or handoff rules."
                  onChange={(event) => updateField('notes', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Proof files</FieldLabel>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md"
                  className="h-auto rounded-lg border-border/80 bg-background file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                />
                <p className="text-xs leading-5 text-muted-foreground">Accepted this phase: PDF, DOCX, TXT, and MD. Uploaded files are attached to the Vapi knowledge base alongside the crawled pack.</p>
                {selectedFiles.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file) => (
                      <Badge key={`${file.name}-${file.size}`} tone="muted">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {workflow.map((step) => (
                <div key={step.label} className="rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                  <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{step.label}</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{step.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="rounded-md"
                disabled={isRunning}
                onClick={() => void runProspector('Running the full demo prospector flow...')}
              >
                {isRunning ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                {isRunning ? 'Running prospector...' : 'Run Prospector'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={isRunning || !result?.persistedBlueprintId}
                onClick={() => void runProspector('Refreshing the persisted Vapi demo assistant...')}
              >
                <Bot data-icon="inline-start" />
                Create/Update Vapi Demo
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={isSyncing || !result?.persistedBlueprintId}
                onClick={() => {
                  setError('');
                  setStatusLabel('Resyncing the persisted knowledge base...');

                  startSync(async () => {
                    const response = await fetch('/api/admin/knowledge-base/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        demoBlueprintId: result?.persistedBlueprintId,
                      }),
                    });
                    const payload = (await response.json()) as { error?: string; queryToolId?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Unable to resync the knowledge base.');
                      return;
                    }

                    setResult((current) =>
                      current
                        ? {
                            ...current,
                            queryToolId: payload.queryToolId ?? current.queryToolId,
                            kbSyncStatus: 'synced',
                          }
                        : current,
                    );
                    setStatusLabel('Knowledge base sync completed.');
                  });
                }}
              >
                <DatabaseZap data-icon="inline-start" />
                {isSyncing ? 'Syncing KB...' : 'Sync KB'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={isCalling || !result?.persistedBlueprintId || !form.targetPhoneNumber}
                onClick={() => {
                  setError('');
                  setStatusLabel('Launching the persisted demo assistant test call...');

                  startCall(async () => {
                    const response = await fetch('/api/admin/demo-prospector/test-call', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        demoBlueprintId: result?.persistedBlueprintId,
                        targetPhoneNumber: form.targetPhoneNumber,
                      }),
                    });
                    const payload = (await response.json()) as DemoCallResult & { error?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Unable to launch the demo test call.');
                      return;
                    }

                    setCallResult(payload);
                    setResult((current) =>
                      current
                        ? {
                            ...current,
                            lastTestCallId: payload.callId,
                            lastTestCallAt: new Date().toISOString(),
                            status: 'test_called',
                          }
                        : current,
                    );
                    setStatusLabel('Demo call queued against the persisted assistant.');
                  });
                }}
              >
                <PhoneCall data-icon="inline-start" />
                {isCalling ? 'Launching call...' : 'Place Test Call'}
              </Button>

              <Button asChild type="button" variant="ghost" className="rounded-md" disabled={!result?.vapiAssistantId}>
                <Link href="https://dashboard.vapi.ai/assistants" target="_blank" rel="noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Open in Vapi
                </Link>
              </Button>
            </div>

            <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{statusLabel}</div>

            {error ? (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTitle>Demo prospector failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {callResult ? (
              <Alert className="border-emerald-500/20 bg-emerald-500/6 text-emerald-100">
                <AlertTitle>{callResult.mode === 'live' ? 'Demo call queued' : 'Call preview generated'}</AlertTitle>
                <AlertDescription>{callResult.message}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Persisted demo</p>
                <CardTitle>{result?.assistantDraft.name ?? 'Waiting for a run'}</CardTitle>
                <CardDescription>Live preview of the generated assistant, knowledge status, and persisted Vapi linkage.</CardDescription>
              </div>
              {result ? (
                <CardAction className="flex flex-wrap gap-2">
                  <Badge tone="muted">{result.businessContext.vertical}</Badge>
                  <Badge tone="cyan">{result.orchestrationMode}</Badge>
                  <Badge tone={statusTone(result.status)}>{result.status ?? 'draft'}</Badge>
                  <Badge tone={kbTone(result.kbSyncStatus)}>{result.kbSyncStatus ?? 'pending'}</Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              {result ? (
                <>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm leading-6 text-muted-foreground">
                    {result.businessContext.summary}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-border/70 bg-background px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Assistant ID</div>
                      <div className="mt-2 break-all text-sm font-medium text-foreground">{result.vapiAssistantId ?? 'Pending'}</div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-background px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pack slug</div>
                      <div className="mt-2 text-sm font-medium text-foreground">{result.knowledgePackSlug ?? 'Pending'}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/6 px-3 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-200">
                      <Bot className="size-3.5" />
                      First message
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{result.assistantDraft.firstMessage}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <WandSparkles className="size-3.5" />
                      System prompt
                    </div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[0.8rem] leading-6 text-muted-foreground">
                      {result.assistantDraft.systemPrompt}
                    </pre>
                  </div>
                  {result.embedSnippet ? (
                    <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <FileUp className="size-3.5" />
                        Embed snippet
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[0.72rem] leading-5 text-muted-foreground">
                        {result.embedSnippet}
                      </pre>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  Run the demo prospector to build the demo blueprint, crawl pack, uploaded file KB, persisted assistant, and embed snippet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Knowledge assets</p>
                <CardTitle>Source inventory</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {result?.uploadedAssets?.length ? (
                result.uploadedAssets.map((asset) => (
                  <div key={asset.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{asset.sourceLabel}</div>
                      <Badge tone={asset.syncStatus === 'synced' ? 'success' : 'muted'}>{asset.syncStatus}</Badge>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {asset.assetType}
                      {asset.fileExt ? ` · ${asset.fileExt.replace('.', '').toUpperCase()}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  No knowledge assets have been generated yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Release gate</p>
                <CardTitle>Tomorrow-night checklist</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {releaseGate.length ? (
                releaseGate.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{item.label}</div>
                      <Badge tone={item.status === 'ready' ? 'success' : item.status === 'warning' ? 'warning' : 'muted'}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  Launch gating will appear once the admin page loads the current environment checks.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Recent blueprints</p>
                <CardTitle>Saved org history</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {recentBlueprints.length ? (
                recentBlueprints.map((blueprint) => (
                  <div key={blueprint.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{blueprint.title}</div>
                      <Badge tone={statusTone(blueprint.status)}>{blueprint.status ?? 'draft'}</Badge>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {blueprint.websiteUrl ?? 'No website captured'} · {blueprint.createdAt}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blueprint.vapiAssistantId ? <Badge tone="cyan">Assistant ready</Badge> : null}
                      {blueprint.uploadedAssets?.length ? <Badge tone="muted">{blueprint.uploadedAssets.length} assets</Badge> : null}
                      {blueprint.kbSyncStatus ? <Badge tone={kbTone(blueprint.kbSyncStatus)}>{blueprint.kbSyncStatus}</Badge> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  No demo blueprints have been saved for this organization yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
