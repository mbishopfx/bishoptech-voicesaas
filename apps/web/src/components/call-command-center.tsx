'use client';

import { useMemo, useState } from 'react';
import { Download, ExternalLink, FileJson, Search } from 'lucide-react';

import type { RecentCall } from '@/lib/types';

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

export function CallCommandCenter({ recentCalls, mode }: CallCommandCenterProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(recentCalls[0]?.id ?? '');

  const filteredCalls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

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
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, recentCalls]);

  const selectedCall = filteredCalls.find((call) => call.id === selectedId) ?? filteredCalls[0] ?? null;
  const uniqueOrganizations = new Set(recentCalls.map((call) => call.organizationName)).size;
  const transcriptedCalls = recentCalls.filter((call) => call.transcript.length).length;

  return (
    <section className="glass-card ops-call-center">
      <div className="ops-call-toolbar">
        <div className="ops-chip-row">
          <span className="ops-chip">{recentCalls.length} calls</span>
          <span className="ops-chip">{uniqueOrganizations} workspaces</span>
          <span className="ops-chip">{transcriptedCalls} with transcript</span>
        </div>

        <label className="ops-search-shell" aria-label="Search calls">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === 'admin' ? 'Search calls across accounts' : 'Search calls in this workspace'}
          />
        </label>
      </div>

      <div className="ops-call-layout">
        <div className="ops-call-list">
          {filteredCalls.length ? (
            filteredCalls.map((call) => (
              <button
                key={call.id}
                className={`ops-call-row ${selectedCall?.id === call.id ? 'is-selected' : ''}`}
                type="button"
                onClick={() => setSelectedId(call.id)}
              >
                <div className="ops-call-row-top">
                  <span className={`ops-call-direction is-${call.direction}`}>{call.direction}</span>
                  <span>{call.createdAt}</span>
                </div>
                <strong>{mode === 'admin' ? call.organizationName : call.caller}</strong>
                <p>{call.summary}</p>
                <div className="ops-call-row-meta">
                  <span>{mode === 'admin' ? call.caller : call.outcome}</span>
                  <span>{call.duration}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="ops-empty-state">No calls matched the current search.</div>
          )}
        </div>

        <div className="ops-call-detail">
          {selectedCall ? (
            <>
              <div className="ops-call-detail-head">
                <div>
                  <span className="eyebrow-text">{selectedCall.organizationName}</span>
                  <h2>{selectedCall.caller}</h2>
                </div>

                <div className="ops-chip-row">
                  <span className={`ops-chip is-tone-${selectedCall.direction === 'inbound' ? 'cyan' : 'mint'}`}>
                    {selectedCall.outcome}
                  </span>
                  <span className="ops-chip">{selectedCall.duration}</span>
                </div>
              </div>

              <div className="ops-call-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `${selectedCall.organizationName}-${selectedCall.id}-transcript.txt`,
                      selectedCall.exportText,
                      'text/plain;charset=utf-8',
                    )
                  }
                >
                  <Download size={16} />
                  <span>Export transcript</span>
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `${selectedCall.organizationName}-${selectedCall.id}.json`,
                      JSON.stringify(selectedCall, null, 2),
                      'application/json;charset=utf-8',
                    )
                  }
                >
                  <FileJson size={16} />
                  <span>Export JSON</span>
                </button>

                {selectedCall.recordingUrl ? (
                  <a className="ghost-button" href={selectedCall.recordingUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    <span>{selectedCall.recordingLabel ?? 'Open recording'}</span>
                  </a>
                ) : null}
              </div>

              <div className="ops-kv-grid">
                <article className="ops-log-card">
                  <span>From</span>
                  <strong>{selectedCall.fromNumber ?? 'Unknown'}</strong>
                </article>
                <article className="ops-log-card">
                  <span>To</span>
                  <strong>{selectedCall.toNumber ?? 'Unknown'}</strong>
                </article>
                <article className="ops-log-card">
                  <span>Assistant</span>
                  <strong>{selectedCall.assistantName ?? 'Not logged'}</strong>
                </article>
                <article className="ops-log-card">
                  <span>Model</span>
                  <strong>{selectedCall.modelName ?? 'Not logged'}</strong>
                </article>
              </div>

              {selectedCall.tags.length ? (
                <div className="ops-tag-row">
                  {selectedCall.tags.map((tag) => (
                    <span key={tag} className="surface-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="ops-call-detail-grid">
                <section className="ops-detail-panel">
                  <div className="ops-panel-head">
                    <span className="eyebrow-text">Transcript</span>
                    <strong>{selectedCall.transcript.length} lines</strong>
                  </div>

                  <div className="ops-transcript-feed">
                    {selectedCall.transcript.length ? (
                      selectedCall.transcript.map((entry) => (
                        <article key={entry.id} className={`ops-transcript-line is-${entry.speaker}`}>
                          <div className="ops-transcript-meta">
                            <span>{entry.label}</span>
                            {entry.timestamp ? <small>{entry.timestamp}</small> : null}
                          </div>
                          <p>{entry.text}</p>
                        </article>
                      ))
                    ) : (
                      <div className="ops-empty-state">No transcript lines were stored for this call.</div>
                    )}
                  </div>
                </section>

                <section className="ops-detail-panel">
                  <div className="ops-panel-head">
                    <span className="eyebrow-text">Call log</span>
                    <strong>{selectedCall.startedAt ?? selectedCall.createdAt}</strong>
                  </div>

                  <div className="ops-log-grid">
                    {selectedCall.logItems.map((item) => (
                      <article key={`${selectedCall.id}-${item.label}`} className="ops-log-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="ops-summary-card">
                    <span className="eyebrow-text">Summary</span>
                    <p>{selectedCall.summary}</p>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="ops-empty-state">No call selected.</div>
          )}
        </div>
      </div>
    </section>
  );
}
