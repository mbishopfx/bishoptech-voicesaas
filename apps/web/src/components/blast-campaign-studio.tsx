'use client';

import { useMemo, useState, useTransition } from 'react';

import { parseBlastCsv } from '@/lib/csv';
import type { BlastCampaignResult, DashboardAgent } from '@/lib/types';

type BlastCampaignStudioProps = {
  organizationId: string;
  agents: DashboardAgent[];
};

export function BlastCampaignStudio({ organizationId, agents }: BlastCampaignStudioProps) {
  const outboundAgent = agents.find((agent) => agent.role === 'outbound');
  const [campaignName, setCampaignName] = useState('');
  const [script, setScript] = useState('');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<BlastCampaignResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => parseBlastCsv(csvText), [csvText]);

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Blast campaigns</span>
          <h3>Normalize a CSV list and launch outreach from the outbound agent.</h3>
        </div>
        <p>The campaign creates a separate Vapi assistant so broadcast traffic never muddies the inbound workflow.</p>
      </div>

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Campaign setup</span>
              <h3>{outboundAgent?.name ?? 'No outbound agent assigned'}</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Campaign name</span>
              <input
                value={campaignName}
                placeholder="Spring reactivation sweep"
                onChange={(event) => setCampaignName(event.target.value)}
              />
            </label>

            <label className="field field-span-2">
              <span>Campaign script</span>
              <textarea
                rows={4}
                value={script}
                placeholder="Introduce the business, explain the reason for the call, and ask if they want a callback or booking."
                onChange={(event) => setScript(event.target.value)}
              />
            </label>

            <label className="field field-span-2">
              <span>CSV content</span>
              <textarea
                rows={8}
                value={csvText}
                placeholder={'name,phone\nJane Smith,(214) 555-0147\nMarcus Lee,972-555-0112'}
                onChange={(event) => setCsvText(event.target.value)}
              />
            </label>

            <label className="field field-span-2 upload-field">
              <span>Upload CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    setCsvText(typeof reader.result === 'string' ? reader.result : '');
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          <div className="button-row">
            <button
              className="liquid-button"
              type="button"
              disabled={isPending || !outboundAgent}
              onClick={() => {
                if (!outboundAgent) {
                  setError('This organization does not have an outbound agent yet.');
                  return;
                }

                setError('');
                startTransition(async () => {
                  const response = await fetch('/api/blast-campaign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      organizationId,
                      campaignName,
                      csvText,
                      script,
                      assistantId: outboundAgent.id,
                    }),
                  });

                  const payload = (await response.json()) as BlastCampaignResult & { error?: string };

                  if (!response.ok) {
                    setError(payload.error ?? 'Blast campaign failed to launch.');
                    return;
                  }

                  setResult(payload);
                });
              }}
            >
              {isPending ? 'Launching campaign...' : 'Launch blast campaign'}
            </button>
          </div>

          {error ? <p className="notice error-notice">{error}</p> : null}
          {result ? (
            <div className="notice success-notice">
              <strong>{result.campaignName}</strong>
              <p>
                Accepted {result.recipientsAccepted} recipients and rejected {result.recipientsRejected}.
              </p>
            </div>
          ) : null}
        </div>

        <div className="glass-card workspace-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">CSV parsing preview</span>
              <h3>Validation before launch</h3>
            </div>
          </div>

          <div className="pill-row">
            <span className="surface-pill">{preview.validRecipients.length} valid</span>
            <span className="surface-pill">{preview.rejectedRows.length} rejected</span>
            {outboundAgent ? <span className="surface-pill">{outboundAgent.voice}</span> : null}
          </div>

          <div className="table-shell compact-table">
            <div className="table-header">
              <span>Recipient</span>
              <span>Phone</span>
              <span>Status</span>
            </div>

            {preview.validRecipients.length ? (
              preview.validRecipients.slice(0, 6).map((recipient) => (
                <div key={`${recipient.phoneNumber}-${recipient.rowNumber}`} className="table-row">
                  <div>
                    <strong>{recipient.name || 'Unnamed contact'}</strong>
                    <p>Row {recipient.rowNumber}</p>
                  </div>
                  <div>{recipient.phoneNumber}</div>
                  <div>Accepted</div>
                </div>
              ))
            ) : (
              <div className="table-empty">Paste or upload a CSV to see normalized recipients.</div>
            )}
          </div>

          {preview.rejectedRows.length ? (
            <div className="notice">
              {preview.rejectedRows.slice(0, 5).map((row) => (
                <p key={`${row.rowNumber}-${row.reason}`}>
                  Row {row.rowNumber}: {row.reason}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
