'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, PhoneOff, Sparkles } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DashboardAgent } from '@/lib/types';
import type { ClientPlaygroundScenario } from '@/lib/voiceops-contracts';

type TranscriptEntry = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type ClientSandboxPanelProps = {
  organizationId: string;
  agents: DashboardAgent[];
  publicKey?: string;
  scenarios: ClientPlaygroundScenario[];
};

export function ClientSandboxPanel({ organizationId, agents, publicKey, scenarios }: ClientSandboxPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? '');
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? '');
  const [mode, setMode] = useState<'draft' | 'live'>('draft');
  const [statusLabel, setStatusLabel] = useState('Pick an assistant and start a browser call to hear the experience for yourself.');
  const [errorLabel, setErrorLabel] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'live' | 'ending'>('idle');
  const [isPending, startTransition] = useTransition();
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setCallState('live');
      setStatusLabel(`Call connected in ${mode === 'draft' ? 'proposed update' : 'live'} mode.`);
      setErrorLabel('');
    };

    const handleCallEnd = () => {
      setCallState('idle');
      setStatusLabel('Call finished. Review the transcript and leave feedback if you want changes.');
    };

    const handleMessage = (message: { type?: string; role?: 'assistant' | 'user'; transcript?: string }) => {
      if (message.type !== 'transcript' || typeof message.transcript !== 'string' || !message.transcript) {
        return;
      }

      const role = message.role;
      const transcript = message.transcript;

      if (role !== 'assistant' && role !== 'user' || !transcript) {
        return;
      }

      setTranscripts((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: transcript,
        },
      ]);
    };

    const handleError = (error: unknown) => {
      setCallState('idle');
      setErrorLabel(error instanceof Error ? error.message : 'Unable to run the test call.');
    };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('message', handleMessage);
    vapi.on('error', handleError);

    return () => {
      vapi.removeAllListeners();
      void vapi.stop().catch(() => undefined);
      vapiRef.current = null;
    };
  }, [mode, publicKey]);

  async function startSession() {
    if (!selectedAgentId || !selectedScenarioId || !vapiRef.current) {
      return;
    }

    setErrorLabel('');
    setTranscripts([]);
    setCallState('connecting');
    setStatusLabel('Starting the call tester...');

    startTransition(async () => {
      const response = await fetch('/api/client/sandbox/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          agentId: selectedAgentId,
          mode,
          scenarioId: selectedScenarioId,
        }),
      });
      const payload = (await response.json()) as { error?: string; session?: { assistantId: string } };

      if (!response.ok || !payload.session) {
        setCallState('idle');
        setErrorLabel(payload.error ?? 'Unable to start a browser call for this test.');
        return;
      }

      try {
        await vapiRef.current?.start(payload.session.assistantId);
      } catch (error) {
        setCallState('idle');
        setErrorLabel(error instanceof Error ? error.message : 'Unable to start the test call.');
      }
    });
  }

  async function stopSession() {
    setCallState('ending');
    await vapiRef.current?.stop();
    setCallState('idle');
  }

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);

  if (!publicKey) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Call tester unavailable</AlertTitle>
        <AlertDescription>This browser-based call tester is not configured on this deployment yet.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.28fr)_360px]">
      <Card className="py-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Call tester</CardTitle>
              <CardDescription>Hear the current experience, compare updates, and leave feedback without leaving the workspace.</CardDescription>
            </div>
            <Badge tone={mode === 'draft' ? 'warning' : 'success'}>{mode === 'draft' ? 'Proposed update' : 'Live'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 py-4">
          {errorLabel ? (
            <Alert variant="destructive">
              <AlertTitle>Sandbox call</AlertTitle>
              <AlertDescription>{errorLabel}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Assistant" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={mode} onValueChange={(value) => setMode(value as 'draft' | 'live')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="draft">Proposed update</SelectItem>
                  <SelectItem value="live">Current live</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {callState === 'live' || callState === 'connecting' ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={stopSession}>
                <PhoneOff data-icon="inline-start" />
                Stop
              </Button>
            ) : (
              <Button type="button" disabled={isPending || !selectedAgentId} onClick={startSession}>
                <Mic data-icon="inline-start" />
                Start test call
              </Button>
            )}
            <span className="text-sm text-muted-foreground">{statusLabel}</span>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4" />
                Transcript
              </div>
              <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">
                {transcripts.length ? (
                  transcripts.map((entry) => (
                    <div
                      key={entry.id}
                      className={entry.role === 'assistant' ? 'rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3' : 'rounded-md border border-border/70 bg-background p-3'}
                    >
                      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {entry.role === 'assistant' ? 'Assistant' : 'You'}
                      </div>
                      <div className="text-sm leading-6">{entry.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No transcript lines yet.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Card className="py-0">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-base">Scenario brief</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-4 py-4">
                  <div className="text-sm">{selectedScenario?.description ?? 'Pick a scenario to see expected signals.'}</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedScenario?.expectedSignals.map((signal) => (
                      <Badge key={signal} tone="muted">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-base">Feedback notes</CardTitle>
                  <CardDescription>Capture anything you want reviewed or updated after the call.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Tone notes, routing feedback, missed details, or changes you want the team to review."
                    rows={8}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
