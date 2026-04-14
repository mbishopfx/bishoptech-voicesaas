'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileJson,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Sparkles,
  TimerReset,
} from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';
import type { RecentCall } from '@/lib/types';
import { cn } from '@/lib/utils';

type CallCommandCenterProps = {
  recentCalls: RecentCall[];
  mode: 'admin' | 'client';
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function CallKpi({
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

function getDirectionIcon(direction: RecentCall['direction']) {
  return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
}

export function CallCommandCenter({ recentCalls, mode }: CallCommandCenterProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(recentCalls[0]?.id ?? '');
  const deferredQuery = useDeferredValue(query);

  const filteredCalls = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return recentCalls;
    }

    return recentCalls.filter((call) =>
      [
        call.caller,
        call.organizationName,
        call.summary,
        call.outcome,
        call.assistantName ?? '',
        call.modelName ?? '',
        call.fromNumber ?? '',
        call.toNumber ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [deferredQuery, recentCalls]);

  const selectedCall = filteredCalls.find((call) => call.id === selectedId) ?? filteredCalls[0] ?? null;
  const uniqueOrganizations = new Set(recentCalls.map((call) => call.organizationName)).size;
  const transcriptedCalls = recentCalls.filter((call) => call.transcript.length).length;
  const callsWithRecording = recentCalls.filter((call) => call.recordingUrl).length;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CallKpi
          label="Call volume"
          value={String(recentCalls.length)}
          description={mode === 'admin' ? 'Tracked across all visible workspaces.' : 'Recent activity in this workspace.'}
        />
        <CallKpi
          label="Workspaces"
          value={String(uniqueOrganizations)}
          description={mode === 'admin' ? 'Distinct organizations with recent traffic.' : 'Linked operating units using this number set.'}
        />
        <CallKpi
          label="Transcripts"
          value={String(transcriptedCalls)}
          description="Calls with stored transcript data ready for review."
        />
        <CallKpi
          label="Recordings"
          value={String(callsWithRecording)}
          description="Calls with accessible recording playback or export links."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Recent calls</p>
              <CardTitle>Queue</CardTitle>
              <CardDescription>Search and inspect the latest voice traffic without leaving the dashboard.</CardDescription>
            </div>
            <CardAction className="w-full md:w-auto">
              <Badge tone="muted">{filteredCalls.length} visible</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={mode === 'admin' ? 'Search by org, caller, assistant, or number' : 'Search caller, outcome, or number'}
                className="h-10 rounded-lg border-border/80 bg-background pl-9"
              />
            </div>

            <ScrollArea className="h-[540px]">
              <div className="space-y-2 pr-3">
                {filteredCalls.length ? (
                  filteredCalls.map((call) => {
                    const DirectionIcon = getDirectionIcon(call.direction);
                    const isSelected = selectedCall?.id === call.id;

                    return (
                      <button
                        key={call.id}
                        type="button"
                        onClick={() => setSelectedId(call.id)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-border/80 bg-muted/15 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em]">
                              <DirectionIcon className="size-3.5" />
                              <span>{call.direction}</span>
                              <span>{call.createdAt}</span>
                            </div>
                            <div className="truncate text-sm font-medium text-foreground">
                              {mode === 'admin' ? call.organizationName : call.caller}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {mode === 'admin' ? call.caller : call.assistantName ?? 'Assistant unassigned'}
                            </div>
                          </div>
                          <Badge tone={call.direction === 'inbound' ? 'cyan' : 'success'}>{call.outcome}</Badge>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{call.summary}</p>
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{call.duration}</span>
                          <span>{call.fromNumber ?? call.toNumber ?? 'No number logged'}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState>No calls matched the current search.</EmptyState>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedCall ? (
          <div className="grid gap-4">
            <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
              <CardHeader className="gap-4 border-b border-border/70 pb-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="muted">{selectedCall.organizationName}</Badge>
                    <Badge tone={selectedCall.direction === 'inbound' ? 'cyan' : 'success'}>
                      {selectedCall.direction}
                    </Badge>
                    <Badge tone="muted">{selectedCall.duration}</Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl tracking-[-0.04em]">{selectedCall.caller}</CardTitle>
                    <CardDescription className="max-w-3xl text-sm leading-6">
                      {selectedCall.summary}
                    </CardDescription>
                  </div>
                </div>
                <CardAction className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    type="button"
                    onClick={() =>
                      downloadFile(
                        `${selectedCall.organizationName}-${selectedCall.id}-transcript.txt`,
                        selectedCall.exportText,
                        'text/plain;charset=utf-8',
                      )
                    }
                  >
                    <Download data-icon="inline-start" />
                    Export transcript
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    type="button"
                    onClick={() =>
                      downloadFile(
                        `${selectedCall.organizationName}-${selectedCall.id}.json`,
                        JSON.stringify(selectedCall, null, 2),
                        'application/json;charset=utf-8',
                      )
                    }
                  >
                    <FileJson data-icon="inline-start" />
                    Export JSON
                  </Button>
                  {selectedCall.recordingUrl ? (
                    <Button asChild variant="outline" size="sm" className="rounded-md">
                      <a href={selectedCall.recordingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink data-icon="inline-start" />
                        {selectedCall.recordingLabel ?? 'Open recording'}
                      </a>
                    </Button>
                  ) : null}
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">From</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.fromNumber ?? 'Unknown'}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">To</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.toNumber ?? 'Unknown'}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Assistant</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.assistantName ?? 'Not logged'}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Model</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.modelName ?? 'Not logged'}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Started</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.startedAt ?? selectedCall.createdAt}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Outcome</div>
                    <div className="mt-2 text-sm font-medium text-foreground">{selectedCall.outcome}</div>
                  </div>
                </div>

                {selectedCall.tags.length ? (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {selectedCall.tags.map((tag) => (
                        <Badge key={tag} tone="muted">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                <CardHeader className="border-b border-border/70 pb-4">
                  <div className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Conversation</p>
                    <CardTitle>Transcript</CardTitle>
                    <CardDescription>{selectedCall.transcript.length} stored lines for this call.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <ScrollArea className="h-[520px]">
                    <div className="space-y-3 pr-3">
                      {selectedCall.transcript.length ? (
                        selectedCall.transcript.map((entry) => (
                          <article
                            key={entry.id}
                            className={cn(
                              'rounded-lg border px-4 py-3',
                              entry.speaker === 'assistant'
                                ? 'border-cyan-500/20 bg-cyan-500/6'
                                : entry.speaker === 'system'
                                  ? 'border-amber-500/20 bg-amber-500/6'
                                  : 'border-border/70 bg-muted/20',
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {entry.speaker === 'assistant' ? (
                                  <Sparkles className="size-3.5" />
                                ) : (
                                  <TimerReset className="size-3.5" />
                                )}
                                <span>{entry.label}</span>
                              </div>
                              {entry.timestamp ? <span className="text-xs text-muted-foreground">{entry.timestamp}</span> : null}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-foreground">{entry.text}</p>
                          </article>
                        ))
                      ) : (
                        <EmptyState>No transcript lines were stored for this call.</EmptyState>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                  <CardHeader className="border-b border-border/70 pb-4">
                    <div className="space-y-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Summary</p>
                      <CardTitle>Call summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 py-4">
                    <p className="text-sm leading-6 text-muted-foreground">{selectedCall.summary}</p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
                  <CardHeader className="border-b border-border/70 pb-4">
                    <div className="space-y-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Runtime</p>
                      <CardTitle>Call log</CardTitle>
                      <CardDescription>Operational metadata captured alongside the transcript.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 py-4">
                    <div className="space-y-2">
                      {selectedCall.logItems.length ? (
                        selectedCall.logItems.map((item) => (
                          <div
                            key={`${selectedCall.id}-${item.label}`}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                          >
                            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</span>
                            <span className="text-right text-sm font-medium text-foreground">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState>No call log values were stored for this record.</EmptyState>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <Card className="border border-border/80 bg-card/85 py-0 shadow-none">
            <CardContent className="px-4 py-12">
              <EmptyState>No call selected.</EmptyState>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
