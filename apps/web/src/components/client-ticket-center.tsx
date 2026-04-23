'use client';

import { useState, useTransition } from 'react';
import { Download, MessageSquarePlus } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { DashboardAgent } from '@/lib/types';
import type { SupportTicket } from '@/lib/voiceops-contracts';

type ClientTicketCenterProps = {
  organizationId: string;
  agents: DashboardAgent[];
  initialTickets: SupportTicket[];
};

export function ClientTicketCenter({ organizationId, agents, initialTickets }: ClientTicketCenterProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState<SupportTicket['ticketType']>('revision');
  const [agentId, setAgentId] = useState('');
  const [preferredMeetingAt, setPreferredMeetingAt] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submitTicket() {
    setNotice('');
    setError('');

    startTransition(async () => {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          agentId: agentId || undefined,
          ticketType,
          subject,
          description,
          preferredMeetingAt: ticketType === 'meeting' && preferredMeetingAt ? new Date(preferredMeetingAt).toISOString() : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; ticket?: SupportTicket };

      if (!response.ok || !payload.ticket) {
        setError(payload.error ?? 'Unable to create the ticket.');
        return;
      }

      setTickets((current) => [payload.ticket as SupportTicket, ...current]);
      setSubject('');
      setDescription('');
      setAgentId('');
      setPreferredMeetingAt('');
      setNotice('Ticket submitted.');
    });
  }

  function exportTickets() {
    setNotice('');
    setError('');

    startTransition(async () => {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          exportType: 'tickets-json',
        }),
      });
      const payload = (await response.json()) as { error?: string; fileName?: string; content?: string; mimeType?: string };

      if (!response.ok || !payload.fileName || !payload.content || !payload.mimeType) {
        setError(payload.error ?? 'Unable to export tickets.');
        return;
      }

      const blob = new Blob([payload.content], { type: payload.mimeType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = payload.fileName;
      link.click();
      URL.revokeObjectURL(href);
      setNotice('Ticket export generated.');
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <Alert>
          <AlertTitle>Tickets</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Tickets</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="py-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Open support threads</CardTitle>
                <CardDescription>Revisions, questions, bugs, and meeting requests tied to this workspace.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={exportTickets} disabled={isPending}>
                <Download data-icon="inline-start" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Latest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length ? (
                    tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{ticket.subject}</div>
                            <div className="text-sm text-muted-foreground">{ticket.description}</div>
                            {ticket.preferredMeetingAt ? (
                              <div className="text-xs text-muted-foreground">Preferred: {ticket.preferredMeetingAt}</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge tone="cyan">{ticket.ticketType}</Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge tone={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'warning'}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">{ticket.messageCount}</TableCell>
                        <TableCell className="align-top">{ticket.latestMessageAt ?? ticket.createdAt}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="px-4 text-muted-foreground" colSpan={5}>
                        No tickets yet for this workspace.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b pb-4">
            <CardTitle>Create a ticket</CardTitle>
            <CardDescription>Open a revision request, question, bug report, or meeting request.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 py-4">
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
            <Select value={ticketType} onValueChange={(value) => setTicketType(value as SupportTicket['ticketType'])}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ticket type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional assistant" />
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
            {ticketType === 'meeting' ? (
              <Input
                type="datetime-local"
                value={preferredMeetingAt}
                onChange={(event) => setPreferredMeetingAt(event.target.value)}
              />
            ) : null}
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the change, question, or issue."
              rows={8}
            />
            <Button type="button" disabled={isPending || subject.trim().length < 2 || description.trim().length < 2} onClick={submitTicket}>
              <MessageSquarePlus data-icon="inline-start" />
              Submit ticket
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
