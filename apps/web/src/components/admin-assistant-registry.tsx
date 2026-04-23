'use client';

import { useMemo, useState, useTransition } from 'react';
import { Archive, CopyPlus, Link2, RefreshCw, Upload } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table';
import type { OrganizationSummary } from '@/lib/types';
import type { AssistantInventoryItem } from '@/lib/voiceops-contracts';

type AdminAssistantRegistryProps = {
  inventory: AssistantInventoryItem[];
  organizations: OrganizationSummary[];
};

function toneForStatus(status: AssistantInventoryItem['syncStatus']) {
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

export function AdminAssistantRegistry({ inventory: initialInventory, organizations }: AdminAssistantRegistryProps) {
  const [inventory, setInventory] = useState(initialInventory);
  const [assistantId, setAssistantId] = useState('');
  const [targetOrganizationId, setTargetOrganizationId] = useState(organizations[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rowSelections, setRowSelections] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => ({
      total: inventory.length,
      assigned: inventory.filter((item) => item.organizationId).length,
      unassigned: inventory.filter((item) => !item.organizationId).length,
      errored: inventory.filter((item) => item.lastError).length,
    }),
    [inventory],
  );

  function selectedOrganizationForRow(id: string) {
    return rowSelections[id] ?? targetOrganizationId;
  }

  function refreshInventory() {
    setErrorMessage('');
    setStatusMessage('');

    startTransition(async () => {
      const response = await fetch('/api/admin/vapi/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'portfolio',
        }),
      });

      const payload = (await response.json()) as { error?: string; summary?: { inventory: AssistantInventoryItem[] } };

      if (!response.ok || !payload.summary) {
        setErrorMessage(payload.error ?? 'Unable to sync the Vapi portfolio.');
        return;
      }

      setInventory(payload.summary.inventory);
      setStatusMessage('Portfolio sync completed.');
    });
  }

  function runImport(mode: 'import' | 'attach' | 'clone', id: string, organizationId?: string) {
    setErrorMessage('');
    setStatusMessage('');

    startTransition(async () => {
      const response = await fetch('/api/admin/assistants/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: id,
          organizationId: organizationId || undefined,
          mode,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Unable to import the assistant.');
        return;
      }

      setStatusMessage(
        mode === 'clone'
          ? 'Assistant cloned into the selected workspace.'
          : mode === 'attach'
            ? 'Assistant attached to the selected workspace.'
            : 'Assistant imported into the workspace registry.',
      );
      refreshInventory();
    });
  }

  function archiveInventoryRow(id: string) {
    setErrorMessage('');
    setStatusMessage('');

    startTransition(async () => {
      const response = await fetch('/api/admin/assistants/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: id,
          mode: 'archive',
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Unable to archive this assistant inventory record.');
        return;
      }

      setStatusMessage('Assistant inventory row archived.');
      refreshInventory();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="py-0">
          <CardHeader className="pb-3">
            <CardDescription>Total assistants</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-0">
          <CardHeader className="pb-3">
            <CardDescription>Assigned to client workspaces</CardDescription>
            <CardTitle className="text-3xl">{summary.assigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-0">
          <CardHeader className="pb-3">
            <CardDescription>Unassigned inventory</CardDescription>
            <CardTitle className="text-3xl">{summary.unassigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-0">
          <CardHeader className="pb-3">
            <CardDescription>Needs review</CardDescription>
            <CardTitle className="text-3xl">{summary.errored}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {statusMessage ? (
        <Alert>
          <AlertTitle>Registry update</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="py-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Synced assistant inventory</CardTitle>
                <CardDescription>Managed account assistants, workspace mapping, and sync health.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={refreshInventory} disabled={isPending}>
                <RefreshCw data-icon="inline-start" />
                Sync portfolio
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Assistant</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Numbers</TableHead>
                    <TableHead>Recent calls</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length ? (
                    inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{item.remoteAssistantId}</div>
                            {item.lastError ? <div className="text-xs text-amber-600">{item.lastError}</div> : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            <div>{item.organizationName ?? 'Unassigned'}</div>
                            <Select
                              value={selectedOrganizationForRow(item.id)}
                              onValueChange={(value) =>
                                setRowSelections((current) => ({
                                  ...current,
                                  [item.id]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select workspace" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {organizations.map((organization) => (
                                    <SelectItem key={organization.id} value={organization.id}>
                                      {organization.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            {item.phoneNumbers.length ? (
                              item.phoneNumbers.map((phoneNumber) => <span key={phoneNumber}>{phoneNumber}</span>)
                            ) : (
                              <span className="text-muted-foreground">None linked</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">{item.recentCallCount}</TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            <Badge tone={toneForStatus(item.syncStatus)}>{item.syncStatus}</Badge>
                            <Badge tone={item.accountMode === 'byo' ? 'warning' : 'success'}>
                              {item.accountMode === 'byo' ? 'BYO' : 'Managed'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isPending || !selectedOrganizationForRow(item.id)}
                              onClick={() => runImport('attach', item.remoteAssistantId, selectedOrganizationForRow(item.id))}
                            >
                              <Link2 data-icon="inline-start" />
                              Attach
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isPending || !selectedOrganizationForRow(item.id)}
                              onClick={() => runImport('clone', item.remoteAssistantId, selectedOrganizationForRow(item.id))}
                            >
                              <CopyPlus data-icon="inline-start" />
                              Clone
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => archiveInventoryRow(item.id)}>
                              <Archive data-icon="inline-start" />
                              Archive
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="px-4 text-muted-foreground" colSpan={6}>
                        No assistant inventory has been synced yet.
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
            <CardTitle>Import by assistant ID</CardTitle>
            <CardDescription>Claim an existing Vapi assistant into a selected client workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 py-4">
            <Input
              value={assistantId}
              onChange={(event) => setAssistantId(event.target.value)}
              placeholder="assistant_xxx"
            />
            <Select value={targetOrganizationId} onValueChange={setTargetOrganizationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isPending || !assistantId.trim()}
                onClick={() => runImport('import', assistantId.trim(), targetOrganizationId || undefined)}
              >
                <Upload data-icon="inline-start" />
                Import
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !assistantId.trim() || !targetOrganizationId}
                onClick={() => runImport('clone', assistantId.trim(), targetOrganizationId)}
              >
                <CopyPlus data-icon="inline-start" />
                Clone into workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
