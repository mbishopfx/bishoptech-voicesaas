'use client';

import { useState, useTransition } from 'react';
import { Building2, KeyRound, Layers3, ShieldCheck } from 'lucide-react';

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
import type { OnboardingRequest, OnboardingResult, OrchestrationMode } from '@/lib/types';

const defaultState: OnboardingRequest = {
  businessName: '',
  vertical: '',
  contactName: '',
  contactEmail: '',
  password: '',
  contactPhone: '',
  timezone: 'America/Chicago',
  websiteUrl: '',
  googleBusinessProfile: '',
  orchestrationMode: 'multi',
  vapiAccountMode: 'managed',
  vapiApiKey: '',
};

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</span>;
}

function OnboardingKpi({
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

export function OnboardingStudio() {
  const [form, setForm] = useState<OnboardingRequest>(defaultState);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function updateField<Key extends keyof OnboardingRequest>(key: Key, value: OnboardingRequest[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OnboardingKpi label="Topology" value={form.orchestrationMode} description="Assistant structure that will be provisioned for the client." />
        <OnboardingKpi label="Vapi mode" value={form.vapiAccountMode === 'byo' ? 'BYO' : 'Managed'} description="Commercial ownership selected for this workspace." />
        <OnboardingKpi label="Timezone" value={form.timezone ?? 'Unset'} description="Workspace default timezone for operations and reporting." />
        <OnboardingKpi label="Status" value={result ? 'Created' : isPending ? 'Provisioning' : 'Draft'} description="Provisioning only starts when you submit the workspace form." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
          <CardHeader className="gap-4 border-b border-border/70 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">Admin only</Badge>
                <Badge tone={form.vapiAccountMode === 'byo' ? 'warning' : 'success'}>
                  {form.vapiAccountMode === 'byo' ? 'BYO onboarding' : 'Managed onboarding'}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-[-0.04em]">Provision client workspace</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  Create the organization, auth user, Vapi ownership mode, and assistant stack from one controlled admin surface.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <FieldLabel>Business name</FieldLabel>
                <Input
                  value={form.businessName}
                  placeholder="Northwind Dental"
                  onChange={(event) => updateField('businessName', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Vertical</FieldLabel>
                <Input
                  value={form.vertical}
                  placeholder="Dental"
                  onChange={(event) => updateField('vertical', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Contact name</FieldLabel>
                <Input
                  value={form.contactName ?? ''}
                  placeholder="Angela Rivers"
                  onChange={(event) => updateField('contactName', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Client email</FieldLabel>
                <Input
                  value={form.contactEmail}
                  placeholder="angela@northwinddental.com"
                  onChange={(event) => updateField('contactEmail', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Initial password</FieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  placeholder="Create an initial password"
                  onChange={(event) => updateField('password', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Contact phone</FieldLabel>
                <Input
                  value={form.contactPhone ?? ''}
                  placeholder="(214) 555-0193"
                  onChange={(event) => updateField('contactPhone', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Timezone</FieldLabel>
                <Input
                  value={form.timezone ?? ''}
                  onChange={(event) => updateField('timezone', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel>Agent topology</FieldLabel>
                <Select
                  value={form.orchestrationMode}
                  onValueChange={(value) => updateField('orchestrationMode', value as OrchestrationMode)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/80 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound only</SelectItem>
                    <SelectItem value="outbound">Outbound primary</SelectItem>
                    <SelectItem value="multi">Inbound + handoff + outbound</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <FieldLabel>Vapi ownership</FieldLabel>
                <Select
                  value={form.vapiAccountMode}
                  onValueChange={(value) => updateField('vapiAccountMode', value as 'managed' | 'byo')}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/80 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="managed">Managed by BishopTech</SelectItem>
                    <SelectItem value="byo">Bring your own Vapi</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              {form.vapiAccountMode === 'byo' ? (
                <label className="space-y-2 md:col-span-2">
                  <FieldLabel>BYO Vapi API key</FieldLabel>
                  <Input
                    value={form.vapiApiKey ?? ''}
                    placeholder="vapi_..."
                    onChange={(event) => updateField('vapiApiKey', event.target.value)}
                    className="h-10 rounded-lg border-border/80 bg-background"
                  />
                </label>
              ) : null}

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Website URL</FieldLabel>
                <Input
                  value={form.websiteUrl ?? ''}
                  placeholder="https://northwinddental.com"
                  onChange={(event) => updateField('websiteUrl', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Google Business Profile text</FieldLabel>
                <Textarea
                  rows={5}
                  value={form.googleBusinessProfile ?? ''}
                  placeholder="Paste the raw Google Business Profile text here."
                  onChange={(event) => updateField('googleBusinessProfile', event.target.value)}
                  className="rounded-lg border-border/80 bg-background"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="rounded-md"
                disabled={isPending}
                onClick={() => {
                  setError('');

                  startTransition(async () => {
                    const response = await fetch('/api/admin/onboard-client', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(form),
                    });

                    const payload = (await response.json()) as OnboardingResult & { error?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Unable to onboard the client.');
                      return;
                    }

                    setResult(payload);
                  });
                }}
              >
                <Building2 data-icon="inline-start" />
                {isPending ? 'Provisioning workspace...' : 'Create client workspace'}
              </Button>
            </div>

            {error ? (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTitle>Provisioning failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Provisioning scope</p>
                <CardTitle>What gets created</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4 text-sm leading-6 text-muted-foreground">
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Inbound concierge</p>
                <p>Handles inbound lead capture, qualification, FAQs, and booking behavior.</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Outbound campaign agent</p>
                <p>Owns blast campaigns, follow-up calls, reminders, and reactivation sequences.</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">Specialist handoff agent</p>
                <p>Takes over for deeper objections, advanced questions, or higher-intent scenarios.</p>
              </div>
            </CardContent>
          </Card>

          {result ? (
            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 pb-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={result.mode === 'live' ? 'success' : 'warning'}>
                      {result.mode === 'live' ? 'Provisioned' : 'Preview only'}
                    </Badge>
                    <Badge tone="muted">{result.organizationSlug}</Badge>
                  </div>
                  <CardTitle>{result.email} is ready to sign in</CardTitle>
                  <CardDescription>Workspace identity and assistant stack are now attached to the organization.</CardDescription>
                </div>
                <CardAction className="flex gap-2">
                  <Badge tone="cyan">{result.orchestrationMode}</Badge>
                  <Badge tone={result.vapiAccountMode === 'byo' ? 'warning' : 'success'}>{result.vapiAccountMode}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">Org {result.organizationId}</Badge>
                  <Badge tone="muted">{result.vapiCredentialMode}</Badge>
                </div>

                <div className="grid gap-3">
                  {result.agents.map((agent) => (
                    <div key={agent.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">{agent.purpose}</div>
                        </div>
                        <Badge tone="muted">{agent.role}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {agent.vapiAssistantId ?? 'Pending Vapi sync'}
                      </div>
                    </div>
                  ))}
                </div>

                {result.warnings.length ? (
                  <Alert className="border-amber-500/20 bg-amber-500/6 text-amber-100">
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>{result.warnings.join(' ')}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
              <CardContent className="px-4 py-6 text-sm text-muted-foreground">
                Provisioned workspace details will appear here after the organization is created.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
