'use client';

import { useState, useTransition } from 'react';

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

export function OnboardingStudio() {
  const [form, setForm] = useState<OnboardingRequest>(defaultState);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function updateField<Key extends keyof OnboardingRequest>(key: Key, value: OnboardingRequest[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <span className="eyebrow-text">Onboarding</span>
          <h3>Provision workspace</h3>
        </div>
      </div>

      <div className="workspace-grid workspace-grid-wide">
        <div className="glass-card form-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">Provisioning form</span>
              <h3>New client workspace</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Business name</span>
              <input
                value={form.businessName}
                placeholder="Northwind Dental"
                onChange={(event) => updateField('businessName', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Vertical</span>
              <input value={form.vertical} placeholder="Dental" onChange={(event) => updateField('vertical', event.target.value)} />
            </label>

            <label className="field">
              <span>Contact name</span>
              <input
                value={form.contactName ?? ''}
                placeholder="Angela Rivers"
                onChange={(event) => updateField('contactName', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Client email</span>
              <input
                value={form.contactEmail}
                placeholder="angela@northwinddental.com"
                onChange={(event) => updateField('contactEmail', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Initial password</span>
              <input
                type="password"
                value={form.password}
                placeholder="Create an initial password"
                onChange={(event) => updateField('password', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Contact phone</span>
              <input
                value={form.contactPhone ?? ''}
                placeholder="(214) 555-0193"
                onChange={(event) => updateField('contactPhone', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Timezone</span>
              <input value={form.timezone ?? ''} onChange={(event) => updateField('timezone', event.target.value)} />
            </label>

            <label className="field">
              <span>Agent topology</span>
              <select
                className="select-field"
                value={form.orchestrationMode}
                onChange={(event) => updateField('orchestrationMode', event.target.value as OrchestrationMode)}
              >
                <option value="inbound">Inbound only</option>
                <option value="outbound">Outbound primary</option>
                <option value="multi">Inbound + handoff + outbound</option>
              </select>
            </label>

            <label className="field">
              <span>Vapi ownership</span>
              <select className="select-field" value={form.vapiAccountMode} onChange={(event) => updateField('vapiAccountMode', event.target.value as 'managed' | 'byo')}>
                <option value="managed">Managed by BishopTech</option>
                <option value="byo">Bring your own Vapi</option>
              </select>
            </label>

            {form.vapiAccountMode === 'byo' ? (
              <label className="field field-span-2">
                <span>BYO Vapi API key</span>
                <input
                  value={form.vapiApiKey ?? ''}
                  placeholder="vapi_..."
                  onChange={(event) => updateField('vapiApiKey', event.target.value)}
                />
              </label>
            ) : null}

            <label className="field field-span-2">
              <span>Website URL</span>
              <input
                value={form.websiteUrl ?? ''}
                placeholder="https://northwinddental.com"
                onChange={(event) => updateField('websiteUrl', event.target.value)}
              />
            </label>

            <label className="field field-span-2">
              <span>Google Business Profile text</span>
              <textarea
                rows={4}
                value={form.googleBusinessProfile ?? ''}
                placeholder="Paste the raw Google Business Profile text here."
                onChange={(event) => updateField('googleBusinessProfile', event.target.value)}
              />
            </label>
          </div>

          <div className="button-row">
            <button
              className="liquid-button"
              type="button"
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
              {isPending ? 'Provisioning workspace...' : 'Create client workspace'}
            </button>
          </div>

          {error ? <p className="notice error-notice">{error}</p> : null}
        </div>

        <div className="glass-card workspace-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">What gets created</span>
              <h3>One account, three assistants, one managed offer</h3>
            </div>
          </div>

          <div className="bullet-list">
            <div>
              <strong>Inbound concierge</strong>
              <p>Handles inbound lead capture, qualification, FAQs, and booking behavior.</p>
            </div>
            <div>
              <strong>Outbound campaign agent</strong>
              <p>Owns blast campaigns, follow-up calls, reminders, and reactivation sequences.</p>
            </div>
            <div>
              <strong>Specialist handoff agent</strong>
              <p>Takes over for deeper objections, advanced questions, or higher-intent scenarios.</p>
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <div className="glass-card result-card">
          <div className="card-header">
            <div>
              <span className="eyebrow-text">{result.mode === 'live' ? 'Provisioned' : 'Preview only'}</span>
              <h3>{result.email} is ready to sign in.</h3>
            </div>
          </div>

          <div className="pill-row">
            <span className="surface-pill">Org {result.organizationId}</span>
            <span className="surface-pill">{result.organizationSlug}</span>
            <span className="surface-pill">{result.orchestrationMode}</span>
            <span className="surface-pill">{result.vapiAccountMode}</span>
            <span className="surface-pill">{result.vapiCredentialMode}</span>
          </div>

          <div className="agent-stack-grid">
            {result.agents.map((agent) => (
              <div className="agent-card" key={agent.id}>
                <span className="surface-pill">{agent.role}</span>
                <strong>{agent.name}</strong>
                <p>{agent.purpose}</p>
                <small>{agent.vapiAssistantId ?? 'Pending Vapi sync'}</small>
              </div>
            ))}
          </div>

          {result.warnings.length ? (
            <div className="notice">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
