'use client';

import { useState, useTransition } from 'react';
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';

import type { VapiAccountMode } from '@/lib/assistant-config';
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

function SettingKpi({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="space-y-1 px-4 py-4">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="text-xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</span>;
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
      ? 'Bring your own Vapi keeps customers on their own account and lowers the platform fee.'
      : 'Managed Vapi keeps onboarding simple and rolls usage under BishopTech operations.';

  return (
    <section className="space-y-6">
      <Card className="border-border/80 bg-card/80 py-0 shadow-none">
        <CardContent className="grid divide-y divide-border/70 px-0 py-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          <SettingKpi label="Workspace" value={organizationName} description={organizationSlug} />
          <SettingKpi label="Plan" value={planName ?? 'Managed'} description="Commercial plan attached to this workspace." />
          <SettingKpi label="Timezone" value={timezone} description="Primary operating timezone used for scheduling and timestamps." />
          <SettingKpi
            label="Vapi mode"
            value={mode === 'byo' ? 'BYO' : 'Managed'}
            description={credentialMode === 'byo' ? 'Customer key currently attached.' : 'Platform-managed credential in use.'}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
          <CardHeader className="gap-4 border-b border-border/70 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={mode === 'byo' ? 'cyan' : 'success'}>{mode === 'byo' ? 'BYO Vapi' : 'Managed Vapi'}</Badge>
                <Badge tone={credentialMode === 'byo' ? 'cyan' : 'muted'}>
                  {credentialMode === 'byo' ? 'Key attached' : 'Platform-managed'}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-[-0.04em]">Vapi ownership and credentials</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  Switch between managed and customer-owned Vapi accounts without changing how the rest of the product operates.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
            {notice ? (
              <Alert className="border-emerald-500/20 bg-emerald-500/6 text-emerald-100">
                <AlertTitle>Workspace updated</AlertTitle>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTitle>Update failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Account mode</FieldLabel>
                <Select value={mode} disabled={!canEdit || isPending} onValueChange={(value) => setMode(value as VapiAccountMode)}>
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
                <FieldLabel>Managed label</FieldLabel>
                <Input value={vapiManagedLabel ?? 'Managed by BishopTech'} disabled readOnly className="h-10 border-border/80 bg-background" />
              </label>

              <label className="space-y-2">
                <FieldLabel>Current key</FieldLabel>
                <Input value={vapiApiKeyLabel ?? 'No BYO key connected'} disabled readOnly className="h-10 border-border/80 bg-background" />
              </label>

              <label className="space-y-2">
                <FieldLabel>Stored key id</FieldLabel>
                <Input value={storedApiKeyId ?? 'No stored key'} disabled readOnly className="h-10 border-border/80 bg-background" />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Key label</FieldLabel>
                <Input
                  value={apiKeyLabel}
                  placeholder={`${organizationName} Vapi key`}
                  disabled={!canEdit || isPending || mode !== 'byo'}
                  onChange={(event) => setApiKeyLabel(event.target.value)}
                  className="h-10 border-border/80 bg-background"
                />
              </label>

              {mode === 'byo' ? (
                <label className="space-y-2 md:col-span-2">
                  <FieldLabel>Replace API key</FieldLabel>
                  <Input
                    value={apiKey}
                    placeholder={vapiApiKeyId ? 'Paste a new key to replace the stored value' : 'Paste your Vapi API key'}
                    disabled={!canEdit || isPending}
                    type="password"
                    onChange={(event) => setApiKey(event.target.value)}
                    className="h-10 border-border/80 bg-background"
                  />
                </label>
              ) : null}
            </div>

            <div className="grid gap-0 rounded-md border border-border/80 bg-background/40">
              <div className="grid gap-2 border-b border-border/80 px-4 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
                <div>
                  <p className="text-sm font-medium text-foreground">Mode summary</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">How this workspace is currently operating.</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{ownershipCopy}</p>
              </div>
              <div className="grid gap-2 px-4 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
                <div>
                  <p className="text-sm font-medium text-foreground">Assistant control</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">What stays stable after the account mode changes.</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Agents still support tone, tools, knowledge base, routing, and publish or sync control from the editor.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={!canEdit || isPending} onClick={handleSave}>
                <ShieldCheck data-icon="inline-start" />
                {isPending ? 'Saving...' : 'Save settings'}
              </Button>
              <Button
                type="button"
                variant="outline"
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
                <RefreshCw data-icon="inline-start" />
                Reset
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
          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Workspace guide</p>
                <CardTitle>Managed vs BYO</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0 text-sm leading-6 text-muted-foreground">
              <div className="divide-y divide-border/70">
                <div className="px-4 py-4">
                  <p className="font-medium text-foreground">Managed Vapi</p>
                  <p className="mt-1">Fastest onboarding path. BishopTech carries the platform overhead and standardizes the stack.</p>
                </div>
                <div className="px-4 py-4">
                  <p className="font-medium text-foreground">BYO Vapi</p>
                  <p className="mt-1">Lower monthly pricing. The customer controls the Vapi account, usage, and billing relationship.</p>
                </div>
                <div className="px-4 py-4">
                  <p className="font-medium text-foreground">Switching later</p>
                  <p className="mt-1">Mode changes stay inside the platform, so agent editing and publish or sync behavior stays consistent.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Current state</p>
                <CardTitle>Workspace snapshot</CardTitle>
                <CardDescription>{ownershipCopy}</CardDescription>
              </div>
              <CardAction>
                <Badge tone={credentialMode === 'byo' ? 'cyan' : 'success'}>
                  {credentialMode === 'byo' ? 'Customer-owned' : 'Platform-owned'}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="divide-y divide-border/70">
                <div className="flex items-start gap-3 px-4 py-4">
                  <KeyRound className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Credential mode</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {credentialMode === 'byo' ? 'Customer-managed Vapi key attached.' : 'Platform-managed Vapi key in use.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-4">
                  <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Assistant control</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Agents still support tone, tools, knowledge base, routing, and publish or sync control from the editor.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
