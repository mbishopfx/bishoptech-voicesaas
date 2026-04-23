'use client';

import { useState, useTransition } from 'react';
import { Download } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type WorkspaceExportButtonProps = {
  organizationId: string;
  exportType: 'leads-csv' | 'calls-json' | 'tickets-json';
  label: string;
  variant?: 'default' | 'outline' | 'ghost';
};

export function WorkspaceExportButton({
  organizationId,
  exportType,
  label,
  variant = 'outline',
}: WorkspaceExportButtonProps) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    setError('');
    setNotice('');

    startTransition(async () => {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          exportType,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fileName?: string;
        content?: string;
        mimeType?: string;
      };

      if (!response.ok || !payload.fileName || !payload.content || !payload.mimeType) {
        setError(payload.error ?? 'Unable to export workspace data.');
        return;
      }

      const blob = new Blob([payload.content], { type: payload.mimeType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = payload.fileName;
      link.click();
      URL.revokeObjectURL(href);
      setNotice(`${label} ready.`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <Alert variant="destructive" className="w-full max-w-sm">
          <AlertTitle>Export failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert className="w-full max-w-sm">
          <AlertTitle>Export ready</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="button" variant={variant} disabled={isPending} onClick={handleExport}>
        <Download data-icon="inline-start" />
        {label}
      </Button>
    </div>
  );
}
