'use client';

import { useState, useTransition } from 'react';
import { Bot, PhoneCall, Sparkles, WandSparkles } from 'lucide-react';

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
  DemoTemplateInput,
  DemoTemplateResult,
  OrchestrationMode,
} from '@/lib/types';

type DemoStudioProps = {
  organizationId?: string;
  recentBlueprints?: DemoBlueprintSummary[];
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

export function DemoStudio({ organizationId, recentBlueprints = [] }: DemoStudioProps) {
  const [form, setForm] = useState<DemoTemplateInput>(initialFormState);
  const [template, setTemplate] = useState<DemoTemplateResult | null>(null);
  const [callResult, setCallResult] = useState<DemoCallResult | null>(null);
  const [error, setError] = useState('');
  const [isGenerating, startGenerate] = useTransition();
  const [isCalling, startCall] = useTransition();

  function updateField<Key extends keyof DemoTemplateInput>(key: Key, value: DemoTemplateInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DemoKpi label="Blueprints" value={String(recentBlueprints.length)} description="Recent saved demo blueprints available for reuse." />
        <DemoKpi label="Topology" value={form.orchestrationMode ?? 'multi'} description="Conversation shape to generate for this prospect demo." />
        <DemoKpi label="Generation" value={template ? 'Ready' : isGenerating ? 'Running' : 'Draft'} description="Template generation stays local until you explicitly call." />
        <DemoKpi label="Call launch" value={callResult ? callResult.mode : isCalling ? 'Launching' : 'Standby'} description="Optional live call after the blueprint looks correct." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_380px]">
        <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
          <CardHeader className="gap-4 border-b border-border/70 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">Admin tool</Badge>
                <Badge tone="muted">Demo generation</Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-[-0.04em]">Generate demo blueprint</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  Build a prospect-ready assistant draft from website context, GBP notes, and a defined goal before deciding whether to launch a live test call.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-4">
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
                <FieldLabel>Google Business Profile text</FieldLabel>
                <Textarea
                  rows={6}
                  value={form.googleBusinessProfile ?? ''}
                  placeholder="Paste the raw Google Business Profile text."
                  onChange={(event) => updateField('googleBusinessProfile', event.target.value)}
                  className="rounded-lg border-border/80 bg-background"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <FieldLabel>Demo goal</FieldLabel>
                <Textarea
                  rows={4}
                  value={form.goal ?? ''}
                  placeholder="Explain the scenario you want this demo to prove."
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
                <FieldLabel>Notes</FieldLabel>
                <Input
                  value={form.notes ?? ''}
                  placeholder="Tone, objections, offer positioning, or constraints."
                  onChange={(event) => updateField('notes', event.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="rounded-md"
                disabled={isGenerating}
                onClick={() => {
                  setError('');
                  setCallResult(null);

                  startGenerate(async () => {
                    const response = await fetch('/api/demo-template', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...form,
                        organizationId,
                      }),
                    });

                    const payload = (await response.json()) as DemoTemplateResult & { error?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Demo template generation failed.');
                      return;
                    }

                    setTemplate(payload);
                  });
                }}
              >
                <Sparkles data-icon="inline-start" />
                {isGenerating ? 'Generating blueprint...' : 'Generate demo blueprint'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={isCalling || !template || !form.targetPhoneNumber}
                onClick={() => {
                  setError('');

                  startCall(async () => {
                    const response = await fetch('/api/demo-call', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        organizationId,
                        targetPhoneNumber: form.targetPhoneNumber,
                        template,
                      }),
                    });

                    const payload = (await response.json()) as DemoCallResult & { error?: string };

                    if (!response.ok) {
                      setError(payload.error ?? 'Demo call could not be launched.');
                      return;
                    }

                    setCallResult(payload);
                  });
                }}
              >
                <PhoneCall data-icon="inline-start" />
                {isCalling ? 'Launching call...' : 'Create assistant + call now'}
              </Button>
            </div>

            {error ? (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTitle>Demo generation failed</AlertTitle>
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
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Generated assistant</p>
                <CardTitle>{template?.assistantDraft.name ?? 'Waiting for generation'}</CardTitle>
                <CardDescription>Preview the generated assistant before you commit a live call.</CardDescription>
              </div>
              {template ? (
                <CardAction className="flex gap-2">
                  <Badge tone="muted">{template.businessContext.vertical}</Badge>
                  <Badge tone="cyan">{template.orchestrationMode}</Badge>
                  <Badge tone={template.mode === 'live' ? 'success' : 'warning'}>
                    {template.mode === 'live' ? 'Gemini' : 'Fallback'}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              {template ? (
                <>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm leading-6 text-muted-foreground">
                    {template.businessContext.summary}
                  </div>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/6 px-3 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-200">
                      <Bot className="size-3.5" />
                      First message
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{template.assistantDraft.firstMessage}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <WandSparkles className="size-3.5" />
                      System prompt
                    </div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[0.8rem] leading-6 text-muted-foreground">
                      {template.assistantDraft.systemPrompt}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  Generate a demo blueprint to preview the assistant system message, first response, capture fields, and live call stack.
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
                    <div className="font-medium text-foreground">{blueprint.title}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {blueprint.websiteUrl ?? 'No website captured'} · {blueprint.createdAt}
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
