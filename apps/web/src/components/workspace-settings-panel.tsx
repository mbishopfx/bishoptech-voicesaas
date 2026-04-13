'use client';

import { useState, useTransition } from 'react';

import type { VapiAccountMode } from '@/lib/assistant-config';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type WorkspaceSettingsResponse = {
  message?: string;
  error?: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  accountMode: VapiAccountMode;
  credentialMode: 'managed' | 'byo';
  vapiManagedLabel: string | null;
  vapiApiKeyId: string | null;
  vapiApiKeyLabel: string | null;
  canEdit: boolean;
};

type WorkspaceSettingsPanelProps = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  planName: string | null;
  timezone: string;
  accountMode: VapiAccountMode;
  credentialMode: 'managed' | 'byo';
  vapiManagedLabel: string | null;
  vapiApiKeyId: string | null;
  vapiApiKeyLabel: string | null;
  canEdit: boolean;
};

function buildRequestBody(
  organizationId: string,
  accountMode: VapiAccountMode,
  apiKeyLabel: string,
  apiKey: string,
  apiKeyId: string | null,
) {
  return {
    organizationId,
    accountMode,
    apiKeyLabel: apiKeyLabel.trim() || undefined,
    apiKey: accountMode === 'byo' ? apiKey.trim() || undefined : undefined,
    apiKeyId: accountMode === 'byo' ? apiKeyId ?? undefined : undefined,
  };
}

export function WorkspaceSettingsPanel({
  organizationId,
  organizationName,
  organizationSlug,
  planName,
  timezone,
  accountMode,
  credentialMode,
  vapiManagedLabel,
  vapiApiKeyId,
  vapiApiKeyLabel,
  canEdit,
}: WorkspaceSettingsPanelProps) {
  const [mode, setMode] = useState<VapiAccountMode>(accountMode);
  const [apiKeyLabel, setApiKeyLabel] = useState(vapiApiKeyLabel ?? `${organizationName} Vapi key`);
  const [apiKey, setApiKey] = useState('');
  const [storedApiKeyId, setStoredApiKeyId] = useState<string | null>(vapiApiKeyId);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError('');
    setNotice('');

    startTransition(async () => {
      const response = await fetch('/api/organization/vapi', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody(organizationId, mode, apiKeyLabel, apiKey, storedApiKeyId)),
      });

      const payload = (await response.json()) as WorkspaceSettingsResponse;

      if (!response.ok) {
        setError(payload.error ?? 'Unable to save workspace settings.');
        return;
      }

      setMode(payload.accountMode);
      setApiKeyLabel(payload.vapiApiKeyLabel ?? apiKeyLabel);
      setStoredApiKeyId(payload.vapiApiKeyId ?? storedApiKeyId);
      setApiKey('');
      setNotice(payload.message ?? 'Workspace settings saved.');
    });
  }

  const ownershipCopy =
    mode === 'byo'
      ? 'Bring your own Vapi keeps customers on their own account and makes the platform fee lower.'
      : 'Managed Vapi keeps onboarding simple and bundles API usage under BishopTech.';

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Workspace settings</span>
          <h3>{organizationName}</h3>
          <p>{organizationSlug}</p>
        </div>
        <div className="pill-row">
          <Badge tone={mode === 'byo' ? 'cyan' : 'success'}>{mode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}</Badge>
          <Badge tone={credentialMode === 'byo' ? 'cyan' : 'muted'}>{credentialMode === 'byo' ? 'Key attached' : 'Platform-managed'}</Badge>
        </div>
      </div>

      {notice ? <div className="notice success-notice">{notice}</div> : null}
      {error ? <div className="notice error-notice">{error}</div> : null}

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Vapi control</span>
              <h3>Ownership and credentials</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Account mode</span>
              <select
                className="select-field"
                value={mode}
                disabled={!canEdit || isPending}
                onChange={(event) => setMode(event.target.value as VapiAccountMode)}
              >
                <option value="managed">Managed by BishopTech</option>
                <option value="byo">Bring your own Vapi</option>
              </select>
            </label>

            <label className="field">
              <span>Managed label</span>
              <input value={vapiManagedLabel ?? 'Managed by BishopTech'} disabled readOnly />
            </label>

            <label className="field">
              <span>Current key</span>
              <input value={vapiApiKeyLabel ?? 'No BYO key connected'} disabled readOnly />
            </label>

            <label className="field">
              <span>Timezone</span>
              <input value={timezone} disabled readOnly />
            </label>

            <label className="field field-span-2">
              <span>Key label</span>
              <input
                value={apiKeyLabel}
                placeholder={`${organizationName} Vapi key`}
                disabled={!canEdit || isPending || mode !== 'byo'}
                onChange={(event) => setApiKeyLabel(event.target.value)}
              />
            </label>

            {mode === 'byo' ? (
              <label className="field field-span-2">
                <span>Replace API key</span>
                <input
                  value={apiKey}
                  placeholder={vapiApiKeyId ? 'Paste a new key to replace the stored value' : 'Paste your Vapi API key'}
                  disabled={!canEdit || isPending}
                  type="password"
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className="button-row">
            <button className="liquid-button" type="button" disabled={!canEdit || isPending} onClick={handleSave}>
              {isPending ? 'Saving...' : 'Save settings'}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={isPending}
              onClick={() => {
                setMode(accountMode);
                setApiKeyLabel(vapiApiKeyLabel ?? `${organizationName} Vapi key`);
                setStoredApiKeyId(vapiApiKeyId);
                setApiKey('');
                setNotice('');
                setError('');
              }}
            >
              Reset
            </button>
          </div>

          {!canEdit ? <p className="notice">This workspace is read-only for your role. Ask an owner, admin, or manager to make changes.</p> : null}
        </div>

        <div className="stack-panel">
          <Card className="glass-card workspace-card">
            <CardHeader className="card-header">
              <div>
                <span className="eyebrow-text">Commercial model</span>
                <CardTitle>Managed vs BYO</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="bullet-list">
              <div>
                <strong>Managed Vapi</strong>
                <p>Fastest onboarding. We carry the platform overhead and standardize the assistant stack for you.</p>
              </div>
              <div>
                <strong>BYO Vapi</strong>
                <p>Cheaper monthly pricing. Your team controls the Vapi account, usage, and billing relationship.</p>
              </div>
              <div>
                <strong>Switching later</strong>
                <p>Mode changes stay inside the platform, so the agent editor, sync flow, and live routing still work the same way.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card workspace-card">
            <CardHeader className="card-header">
              <div>
                <span className="eyebrow-text">Current state</span>
                <CardTitle>Workspace snapshot</CardTitle>
              </div>
            </CardHeader>
          <CardContent className="bullet-list">
              <div>
                <strong>Plan</strong>
                <p>{planName ?? 'Managed voice platform'}</p>
              </div>
              <div>
                <strong>Mode</strong>
                <p>{ownershipCopy}</p>
              </div>
              <div>
                <strong>Credential mode</strong>
                <p>{credentialMode === 'byo' ? 'Customer-managed Vapi key attached.' : 'Platform-managed Vapi key in use.'}</p>
              </div>
              <div>
                <strong>Assistant control</strong>
                <p>Agents still support tone, tools, knowledge base, routing, and publish/sync workflows from the editor.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
