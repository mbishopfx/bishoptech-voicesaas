'use client';

import { useEffect, useState, useTransition } from 'react';

import type { AssistantSyncStatus, VapiAccountMode } from '@/lib/assistant-config';
import { getSystemMessage, setFirstMessage, setSystemMessage } from '@/lib/assistant-config';
import type { DashboardAgent } from '@/lib/types';
import type { VapiAssistantPayload } from '@/lib/vapi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Assistant editor</span>
          <h3>{agent.name}</h3>
          <p>{organizationName}</p>
        </div>
        <div className="pill-row">
          <Badge tone={agent.status === 'live' ? 'success' : 'muted'}>{agent.status}</Badge>
          <Badge tone={syncStatus === 'error' ? 'warning' : syncStatus === 'synced' ? 'success' : 'muted'}>{syncStatus}</Badge>
          <Badge tone={accountMode === 'byo' ? 'cyan' : 'muted'}>{accountMode}</Badge>
        </div>
      </div>

      {lastError ? <div className="notice error-notice">{lastError}</div> : null}
      {notice ? <div className="notice success-notice">{notice}</div> : null}
      {error ? <div className="notice error-notice">{error}</div> : null}

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Draft</span>
              <h3>Control surface</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Account mode</span>
              <select
                className="select-field"
                value={accountMode}
                disabled={!canEdit}
                onChange={(event) => setAccountMode(event.target.value as VapiAccountMode)}
              >
                <option value="managed">Managed by BishopTech</option>
                <option value="byo">Bring your own Vapi</option>
              </select>
            </label>

            <label className="field">
              <span>Assistant name</span>
              <input
                value={draftPayload.name}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>First message</span>
              <input
                value={firstMessage}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => setFirstMessage(current, event.target.value))}
              />
            </label>

            <label className="field field-span-2">
              <span>System prompt</span>
              <textarea
                rows={8}
                value={systemPrompt}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => setSystemMessage(current, event.target.value))}
              />
            </label>

            <label className="field">
              <span>Model provider</span>
              <input
                value={draftPayload.model.provider}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateModelField(current, 'provider', event.target.value))}
              />
            </label>

            <label className="field">
              <span>Model name</span>
              <input
                value={draftPayload.model.model}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateModelField(current, 'model', event.target.value))}
              />
            </label>

            <label className="field field-span-2">
              <span>Model tool IDs</span>
              <input
                value={toolIdsText}
                placeholder="query-tool-id, crm-search-tool"
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => setToolIds(current, event.target.value))}
              />
            </label>

            <label className="field">
              <span>Voice provider</span>
              <input
                value={draftPayload.voice.provider}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateVoiceField(current, 'provider', event.target.value))}
              />
            </label>

            <label className="field">
              <span>Voice ID</span>
              <input
                value={draftPayload.voice.voiceId}
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateVoiceField(current, 'voiceId', event.target.value))}
              />
            </label>

            <label className="field field-span-2">
              <span>Fallback voices</span>
              <textarea
                rows={4}
                value={fallbackVoicesText}
                placeholder="openai:marin"
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateFallbackVoices(current, event.target.value))}
              />
            </label>

            <label className="field">
              <span>Server URL</span>
              <input
                value={typeof draftPayload.server?.url === 'string' ? draftPayload.server.url : ''}
                placeholder="https://hooks.yourdomain.com/vapi"
                disabled={!canEdit}
                onChange={(event) => updateDraft((current) => updateServerPayload(current, event.target.value))}
              />
            </label>

            <label className="field">
              <span>Handoff assistant ID</span>
              <input
                value={typeof draftPayload.handoffTargetAssistantId === 'string' ? draftPayload.handoffTargetAssistantId : ''}
                placeholder="assistant_..."
                disabled={!canEdit}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...clonePayload(current),
                    handoffTargetAssistantId: event.target.value || undefined,
                  }))
                }
              />
            </label>

            <label className="field field-span-2">
              <span>Knowledge base credential ID</span>
              <input
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
              />
            </label>

            <label className="field field-span-2">
              <span>Knowledge base source IDs</span>
              <input
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
              />
            </label>

            <label className="field field-span-2">
              <span>Knowledge base instructions</span>
              <textarea
                rows={4}
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
              />
            </label>
          </div>

          <div className="button-row">
            <button className="liquid-button" type="button" disabled={!canEdit || isPending} onClick={() => submit('save')}>
              {isPending ? 'Saving...' : 'Save Draft'}
            </button>
            <button className="ghost-button" type="button" disabled={!canEdit || isPending} onClick={() => submit('publish')}>
              {isPending ? 'Publishing...' : 'Publish to Vapi'}
            </button>
            <button className="ghost-button" type="button" disabled={!canEdit || isPending} onClick={() => submit('sync')}>
              {isPending ? 'Syncing...' : 'Sync from Vapi'}
            </button>
            <button className="ghost-button" type="button" disabled={!canEdit || isPending} onClick={() => submit('revert')}>
              {isPending ? 'Reverting...' : 'Revert'}
            </button>
          </div>
        </div>

        <div className="stack-panel">
          <Card className="glass-card workspace-card">
            <CardHeader className="card-header">
              <div>
                <span className="eyebrow-text">Advanced</span>
                <CardTitle>Raw config escape hatch</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                rows={26}
                value={rawJson}
                disabled={!canEdit}
                onChange={(event) => setRawJson(event.target.value)}
                className="compact-code"
              />
              <div className="button-row">
                <button className="ghost-button" type="button" disabled={!canEdit || isPending} onClick={applyRawJson}>
                  Apply raw JSON
                </button>
              </div>
              <p className="notice">
                This writes the full assistant payload back into the draft snapshot. Use it when you need fields the structured UI does not expose.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card workspace-card">
            <CardHeader className="card-header">
              <div>
                <span className="eyebrow-text">Manual tasks</span>
                <CardTitle>Console-only steps</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="bullet-list">
              <div>
                <strong>Phone numbers</strong>
                <p>Purchase and provision numbers in Vapi when the task is not API-safe or needs telephony-specific review.</p>
              </div>
              <div>
                <strong>Knowledge sources</strong>
                <p>Upload or verify source material in the provider console if the knowledge-base connector requires a manual step.</p>
              </div>
              <div>
                <strong>Fallback routing</strong>
                <p>Keep escalation targets and server URLs aligned with the live workflow before publishing changes.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card workspace-card">
            <CardHeader className="card-header">
              <div>
                <span className="eyebrow-text">Revisions</span>
                <CardTitle>Change history</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="bullet-list">
              {revisions.length ? (
                revisions.map((revision) => (
                  <div key={revision.id}>
                    <strong>
                      v{revision.version} · {revision.action}
                    </strong>
                    <p>
                      {revision.note ?? 'No note'} • {revision.created_at}
                    </p>
                  </div>
                ))
              ) : (
                <div className="empty-inline">No revisions recorded yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
