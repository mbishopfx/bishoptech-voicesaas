'use client';

import { useEffect, useState, useTransition } from 'react';
import { FileJson, RefreshCw, Save, Upload } from 'lucide-react';

import type { AssistantSyncStatus, VapiAccountMode } from '@/lib/assistant-config';
import { getSystemMessage, setFirstMessage, setSystemMessage } from '@/lib/assistant-config';
import type { DashboardAgent } from '@/lib/types';
import type { VapiAssistantPayload } from '@/lib/vapi';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type AgentEditorResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  agent: DashboardAgent & {
    revisions: Array<{
      id: string;
      action: string;
      version: number;
      created_at: string;
      note: string | null;
    }>;
  };
};

type AgentEditorProps = {
  agent: DashboardAgent & {
    revisions?: AgentEditorResponse['agent']['revisions'];
  };
  organizationName: string;
  canEdit: boolean;
};

function clonePayload(payload: VapiAssistantPayload) {
  return JSON.parse(JSON.stringify(payload)) as VapiAssistantPayload;
}

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFallbackVoices(value: string) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [provider, voiceId] = line.split(':').map((item) => item.trim());

      if (!provider || !voiceId) {
        throw new Error('Fallback voices must use provider:voiceId on each line.');
      }

      return { provider, voiceId };
    });
}

function serializeFallbackVoices(payload: VapiAssistantPayload) {
  return (
    payload.voice.fallbackPlan?.voices
      .map((voice) => `${voice.provider}:${voice.voiceId}`)
      .join('\n') ?? ''
  );
}

function getToolIdsText(payload: VapiAssistantPayload) {
  const toolIds = (payload.model as Record<string, unknown>).toolIds as string[] | undefined;
  return Array.isArray(toolIds) ? toolIds.join(', ') : '';
}

function setToolIds(payload: VapiAssistantPayload, toolIdsText: string) {
  const next = clonePayload(payload);
  const toolIds = parseCsvList(toolIdsText);
  next.model = {
    ...next.model,
    toolIds,
  };
  return next;
}

function getKnowledgeBasePayload(payload: VapiAssistantPayload) {
  return (payload.knowledgeBase ?? {}) as Record<string, unknown>;
}

function updateKnowledgeBase(payload: VapiAssistantPayload, updater: (current: Record<string, unknown>) => Record<string, unknown>) {
  const next = clonePayload(payload);
  next.knowledgeBase = updater(getKnowledgeBasePayload(next));
  return next;
}

function updateServerPayload(payload: VapiAssistantPayload, url: string) {
  const next = clonePayload(payload);
  next.server = {
    ...(next.server ?? {}),
    url,
  };
  return next;
}

function updateModelField(payload: VapiAssistantPayload, key: 'provider' | 'model', value: string) {
  const next = clonePayload(payload);
  next.model = {
    ...next.model,
    [key]: value,
  };
  return next;
}

function updateVoiceField(payload: VapiAssistantPayload, key: 'provider' | 'voiceId', value: string) {
  const next = clonePayload(payload);
  next.voice = {
    ...next.voice,
    [key]: value,
  };
  return next;
}

function updateFallbackVoices(payload: VapiAssistantPayload, value: string) {
  const next = clonePayload(payload);
  const voices = parseFallbackVoices(value);
  next.voice = {
    ...next.voice,
    fallbackPlan: voices.length ? { voices } : undefined,
  };
  return next;
}

function buildRequestBody(action: 'publish' | 'sync' | 'revert', draftPayload: VapiAssistantPayload, accountMode: VapiAccountMode) {
  if (action === 'publish') {
    return { action, draftPayload, accountMode };
  }

  return { action, accountMode };
}

function syncTone(status: AssistantSyncStatus) {
  if (status === 'synced') {
    return 'success';
  }

  if (status === 'error') {
    return 'warning';
  }

  if (status === 'draft' || status === 'dirty') {
    return 'cyan';
  }

  return 'muted';
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</span>;
}

export function AgentEditor({ agent, organizationName, canEdit }: AgentEditorProps) {
  const initialDraft = (agent.draftPayload ??
    agent.livePayload ??
    (agent.config as { draftPayload?: VapiAssistantPayload; vapiPayload?: VapiAssistantPayload } | undefined)?.draftPayload ??
    (agent.config as { draftPayload?: VapiAssistantPayload; vapiPayload?: VapiAssistantPayload } | undefined)?.vapiPayload ??
    {
      name: agent.name,
      firstMessage: '',
      model: {
        provider: 'openai',
        model: 'gpt-realtime-2025-08-28',
        messages: [{ role: 'system', content: '' }],
      },
      voice: {
        provider: 'openai',
        voiceId: 'cedar',
        fallbackPlan: {
          voices: [{ provider: 'openai', voiceId: 'marin' }],
        },
      },
    }) as VapiAssistantPayload;
  const [draftPayload, setDraftPayload] = useState<VapiAssistantPayload>(clonePayload(initialDraft));
  const [accountMode, setAccountMode] = useState<VapiAccountMode>(agent.accountMode ?? 'managed');
  const [rawJson, setRawJson] = useState(JSON.stringify(initialDraft, null, 2));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revisions, setRevisions] = useState(agent.revisions ?? []);
  const [syncStatus, setSyncStatus] = useState<AssistantSyncStatus>(agent.syncStatus ?? 'unknown');
  const [lastError, setLastError] = useState<string | null>(agent.lastError ?? null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRawJson(JSON.stringify(draftPayload, null, 2));
  }, [draftPayload]);

  function updateDraft(updater: (current: VapiAssistantPayload) => VapiAssistantPayload) {
    setDraftPayload((current) => updater(clonePayload(current)));
    setError('');
  }

  function submit(action: 'publish' | 'sync' | 'revert' | 'save') {
    setError('');
    setNotice('');

    startTransition(async () => {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: action === 'save' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          action === 'save'
            ? {
                draftPayload,
                accountMode,
              }
            : buildRequestBody(action, draftPayload, accountMode),
        ),
      });

      const payload = (await response.json()) as AgentEditorResponse & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Unable to update the assistant.');
        return;
      }

      setDraftPayload(clonePayload((payload.agent.draftPayload as VapiAssistantPayload) ?? draftPayload));
      setAccountMode(payload.agent.accountMode ?? accountMode);
      setSyncStatus(payload.agent.syncStatus ?? 'unknown');
      setLastError(payload.agent.lastError ?? null);
      setRevisions(payload.agent.revisions ?? []);
      setNotice(payload.message ?? 'Assistant updated.');
    });
  }

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson) as VapiAssistantPayload;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Raw assistant config must be a JSON object.');
      }

      setDraftPayload(parsed);
      setNotice('Applied raw assistant config.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raw assistant config could not be parsed.');
    }
  }

  const systemPrompt = getSystemMessage(draftPayload);
  const firstMessage = draftPayload.firstMessage ?? '';
  const toolIdsText = getToolIdsText(draftPayload);
  const fallbackVoicesText = serializeFallbackVoices(draftPayload);
  const knowledgeBase = getKnowledgeBasePayload(draftPayload);

  return (
    <section className="space-y-4">
      <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
        <CardHeader className="gap-4 border-b border-border/70 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={agent.status === 'live' ? 'success' : 'muted'}>{agent.status}</Badge>
              <Badge tone={syncTone(syncStatus)}>{syncStatus}</Badge>
              <Badge tone={accountMode === 'byo' ? 'cyan' : 'muted'}>
                {accountMode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-[-0.04em]">{agent.name}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Full assistant control surface for tone, first response, model, voice, knowledge base, routing, and raw payload overrides.
              </CardDescription>
            </div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{organizationName}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Assistant ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{agent.vapiAssistantId ?? 'Not provisioned yet'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Role</p>
              <p className="mt-1 text-sm font-medium text-foreground">{agent.role}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sync</p>
              <p className="mt-1 text-sm font-medium text-foreground">{syncStatus}</p>
            </div>
          </div>
          {lastError ? (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTitle>Last sync error</AlertTitle>
              <AlertDescription>{lastError}</AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <Alert className="border-emerald-500/20 bg-emerald-500/6 text-emerald-100">
              <AlertTitle>Update applied</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTitle>Update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <Card className="py-0">
          <CardHeader className="border-b pb-5">
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Draft payload</p>
              <CardTitle>Assistant controls</CardTitle>
              <CardDescription>Keep the local draft authoritative, then publish or sync explicitly.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Account mode</FieldLabel>
                <Select value={accountMode} disabled={!canEdit} onValueChange={(value) => setAccountMode(value as VapiAccountMode)}>
                  <SelectTrigger className="h-10 w-full border-border/80 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="managed">Managed by BishopTech</SelectItem>
                    <SelectItem value="byo">Bring your own Vapi</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <FieldLabel>Assistant name</FieldLabel>
                <Input
                  value={draftPayload.name}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>First message</FieldLabel>
                <Input
                  value={firstMessage}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => setFirstMessage(current, event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>System prompt</FieldLabel>
                <Textarea
                  rows={10}
                  value={systemPrompt}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => setSystemMessage(current, event.target.value))}
                  className="min-h-[240px] border-border/80 bg-background"
                />
              </label>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Model provider</FieldLabel>
                <Input
                  value={draftPayload.model.provider}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateModelField(current, 'provider', event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Model name</FieldLabel>
                <Input
                  value={draftPayload.model.model}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateModelField(current, 'model', event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Model tool IDs</FieldLabel>
                <Input
                  value={toolIdsText}
                  placeholder="query-tool-id, crm-search-tool"
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => setToolIds(current, event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Voice provider</FieldLabel>
                <Input
                  value={draftPayload.voice.provider}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateVoiceField(current, 'provider', event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Voice ID</FieldLabel>
                <Input
                  value={draftPayload.voice.voiceId}
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateVoiceField(current, 'voiceId', event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Fallback voices</FieldLabel>
                <Textarea
                  rows={4}
                  value={fallbackVoicesText}
                  placeholder="openai:marin"
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateFallbackVoices(current, event.target.value))}
                  className="border-border/80 bg-background font-mono text-[0.82rem]"
                />
              </label>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Server URL</FieldLabel>
                <Input
                  value={typeof draftPayload.server?.url === 'string' ? draftPayload.server.url : ''}
                  placeholder="https://hooks.yourdomain.com/vapi"
                  disabled={!canEdit}
                  onChange={(event) => updateDraft((current) => updateServerPayload(current, event.target.value))}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Handoff assistant ID</FieldLabel>
                <Input
                  value={typeof draftPayload.handoffTargetAssistantId === 'string' ? draftPayload.handoffTargetAssistantId : ''}
                  placeholder="assistant_..."
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...clonePayload(current),
                      handoffTargetAssistantId: event.target.value || undefined,
                    }))
                  }
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Knowledge base credential ID</FieldLabel>
                <Input
                  value={typeof knowledgeBase.credentialId === 'string' ? knowledgeBase.credentialId : ''}
                  placeholder="kb credential id"
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateDraft((current) =>
                      updateKnowledgeBase(current, (currentKnowledgeBase) => ({
                        ...currentKnowledgeBase,
                        credentialId: event.target.value || undefined,
                      })),
                    )
                  }
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Knowledge base source IDs</FieldLabel>
                <Input
                  value={Array.isArray(knowledgeBase.sourceIds) ? (knowledgeBase.sourceIds as string[]).join(', ') : ''}
                  placeholder="source-a, source-b"
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateDraft((current) =>
                      updateKnowledgeBase(current, (currentKnowledgeBase) => ({
                        ...currentKnowledgeBase,
                        sourceIds: parseCsvList(event.target.value),
                      })),
                    )
                  }
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Knowledge base instructions</FieldLabel>
                <Textarea
                  rows={5}
                  value={typeof knowledgeBase.instructions === 'string' ? knowledgeBase.instructions : ''}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateDraft((current) =>
                      updateKnowledgeBase(current, (currentKnowledgeBase) => ({
                        ...currentKnowledgeBase,
                        instructions: event.target.value,
                      })),
                    )
                  }
                  className="border-border/80 bg-background"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={!canEdit || isPending} onClick={() => submit('save')}>
                <Save data-icon="inline-start" />
                {isPending ? 'Saving...' : 'Save draft'}
              </Button>
              <Button type="button" variant="outline" disabled={!canEdit || isPending} onClick={() => submit('publish')}>
                <Upload data-icon="inline-start" />
                {isPending ? 'Publishing...' : 'Publish to Vapi'}
              </Button>
              <Button type="button" variant="outline" disabled={!canEdit || isPending} onClick={() => submit('sync')}>
                <RefreshCw data-icon="inline-start" />
                {isPending ? 'Syncing...' : 'Sync from Vapi'}
              </Button>
              <Button type="button" variant="ghost" disabled={!canEdit || isPending} onClick={() => submit('revert')}>
                Revert
              </Button>
            </div>

            {!canEdit ? (
              <p className="text-sm text-muted-foreground">
                This workspace is read-only for your role. Ask an owner, admin, or manager to make changes.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="py-0">
            <CardHeader className="border-b pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Advanced</p>
                <CardTitle>Raw config</CardTitle>
                <CardDescription>Escape hatch for fields not exposed in the structured editor.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              <Textarea
                rows={22}
                value={rawJson}
                disabled={!canEdit}
                onChange={(event) => setRawJson(event.target.value)}
                className="min-h-[520px] border-border/80 bg-background font-mono text-[0.8rem]"
              />
              <Button type="button" variant="outline" disabled={!canEdit || isPending} onClick={applyRawJson}>
                <FileJson data-icon="inline-start" />
                Apply raw JSON
              </Button>
              <p className="text-sm leading-6 text-muted-foreground">
                This overwrites the current local draft snapshot. Use it when Vapi adds fields you want to pass through directly.
              </p>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Manual steps</p>
                <CardTitle>Console-only work</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4 text-sm leading-6 text-muted-foreground">
              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Phone numbers</p>
                <p>Purchase or reassign numbers in Vapi when telephony review or compliance checks are required.</p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Knowledge sources</p>
                <p>Upload or verify provider-side source files when the knowledge connector requires a manual handoff.</p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Fallback routing</p>
                <p>Keep escalation targets and server URLs aligned with the live routing stack before publishing changes.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">History</p>
                <CardTitle>Revisions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-3">
                  {revisions.length ? (
                    revisions.map((revision) => (
                      <div key={revision.id} className="rounded-md border border-border/70 bg-muted/20 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            v{revision.version} · {revision.action}
                          </span>
                          <Badge tone="muted">{revision.created_at}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{revision.note ?? 'No note recorded.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                      No revisions recorded yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
