'use client';

import { useState, useTransition } from 'react';

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
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Demo studio</span>
          <h3>Generate demo</h3>
        </div>
      </div>

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Inputs</span>
              <h3>Business context</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Business name</span>
              <input
                value={form.businessName ?? ''}
                placeholder="Northwind Dental"
                onChange={(event) => updateField('businessName', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Agent topology</span>
              <select
                className="select-field"
                value={form.orchestrationMode ?? 'multi'}
                onChange={(event) => updateField('orchestrationMode', event.target.value as OrchestrationMode)}
              >
                <option value="inbound">Inbound agent</option>
                <option value="outbound">Outbound agent</option>
                <option value="multi">Multi-agent handoff</option>
              </select>
            </label>

            <label className="field field-span-2">
              <span>Website URL</span>
              <input
                value={form.websiteUrl ?? ''}
                placeholder="https://example.com"
                onChange={(event) => updateField('websiteUrl', event.target.value)}
              />
            </label>

            <label className="field field-span-2">
              <span>Google Business Profile text</span>
              <textarea
                rows={6}
                value={form.googleBusinessProfile ?? ''}
                placeholder="Paste the raw Google Business Profile text."
                onChange={(event) => updateField('googleBusinessProfile', event.target.value)}
              />
            </label>

            <label className="field field-span-2">
              <span>Demo goal</span>
              <textarea
                rows={3}
                value={form.goal ?? ''}
                placeholder="Explain the scenario you want this demo to prove."
                onChange={(event) => updateField('goal', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Target phone number</span>
              <input
                value={form.targetPhoneNumber ?? ''}
                placeholder="+12145550147"
                onChange={(event) => updateField('targetPhoneNumber', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Notes</span>
              <input
                value={form.notes ?? ''}
                placeholder="Tone, objections, offer positioning, or any constraints."
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </label>
          </div>

          <div className="button-row">
            <button
              className="liquid-button"
              type="button"
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
              {isGenerating ? 'Generating blueprint...' : 'Generate demo blueprint'}
            </button>

            <button
              className="ghost-button"
              type="button"
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
              {isCalling ? 'Launching call...' : 'Create assistant + call now'}
            </button>
          </div>

          {error ? <p className="notice error-notice">{error}</p> : null}
          {callResult ? (
            <div className="notice success-notice">
              <strong>{callResult.mode === 'live' ? 'Demo call queued.' : 'Call preview generated.'}</strong>
              <p>{callResult.message}</p>
            </div>
          ) : null}
        </div>

        <div className="stack-panel">
          <div className="glass-card workspace-card">
            <div className="card-header">
              <div>
                <span className="eyebrow-text">Generated assistant</span>
                <h3>{template?.assistantDraft.name ?? 'Waiting for generation'}</h3>
              </div>
            </div>

            {template ? (
              <>
                <div className="pill-row">
                  <span className="surface-pill">{template.businessContext.vertical}</span>
                  <span className="surface-pill">{template.orchestrationMode}</span>
                  <span className="surface-pill">{template.mode === 'live' ? 'Gemini' : 'Fallback'}</span>
                </div>
                <p>{template.businessContext.summary}</p>
                <blockquote className="quote-block">{template.assistantDraft.firstMessage}</blockquote>
                <pre className="code-block compact-code">{template.assistantDraft.systemPrompt}</pre>
              </>
            ) : (
              <div className="empty-inline">
                Generate a demo blueprint to preview the assistant system message, first response, capture fields, and live call stack.
              </div>
            )}
          </div>

          <div className="glass-card workspace-card">
            <div className="card-header">
              <div>
                <span className="eyebrow-text">Recent blueprints</span>
                <h3>Saved org history</h3>
              </div>
            </div>

            {recentBlueprints.length ? (
              <div className="bullet-list">
                {recentBlueprints.map((blueprint) => (
                  <div key={blueprint.id}>
                    <strong>{blueprint.title}</strong>
                    <p>{blueprint.websiteUrl ?? 'No website captured'} • {blueprint.createdAt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">No demo blueprints have been saved for this organization yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
