'use client';

import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Mic, PhoneOff, Radio, Sparkles, Volume2, Waves } from 'lucide-react';
import Vapi from '@vapi-ai/web';

import { BOOKING_LINK, LEAD_CAPTURE_STORAGE_KEY } from '@/lib/booking';
import type { HomepagePersona, HomepagePersonaRole } from '@/lib/homepage-personas';

type TranscriptEntry = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type HomepagePersonaLabProps = {
  publicKey?: string;
  personas: HomepagePersona[];
};

const MAX_DEMO_SECONDS = 45;
function roleLabel(role: HomepagePersonaRole) {
  return role === 'inbound' ? 'Inbound' : 'Outbound';
}

export function HomepagePersonaLab({ publicKey, personas }: HomepagePersonaLabProps) {
  const [activeRole, setActiveRole] = useState<HomepagePersonaRole>('inbound');
  const [selectedSlug, setSelectedSlug] = useState(personas[0]?.slug ?? '');
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'live' | 'ending'>('idle');
  const [statusLabel, setStatusLabel] = useState('Choose a persona, flip the card, and run the 45 second voice preview.');
  const [errorLabel, setErrorLabel] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(MAX_DEMO_SECONDS);
  const [visualTick, setVisualTick] = useState(0);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });
  const vapiRef = useRef<Vapi | null>(null);
  const shouldPromptLeadCaptureRef = useRef(false);
  const endReasonRef = useRef<'manual' | 'timeout' | 'completed' | 'cleanup' | 'error' | null>(null);

  const grouped = useMemo(
    () => ({
      inbound: personas.filter((persona) => persona.role === 'inbound'),
      outbound: personas.filter((persona) => persona.role === 'outbound'),
    }),
    [personas],
  );

  const visiblePersonas = grouped[activeRole];
  const selectedPersona =
    visiblePersonas.find((persona) => persona.slug === selectedSlug) ??
    visiblePersonas[0] ??
    personas[0];

  const demoIsLocked = callState === 'connecting' || callState === 'live' || callState === 'ending';
  const formattedTimer = `00:${String(secondsRemaining).padStart(2, '0')}`;
  const countdownPercent = `${(secondsRemaining / MAX_DEMO_SECONDS) * 100}%`;
  const audioBars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const liveBase = callState === 'live' ? 22 : 10;
        const wave = callState === 'live' ? Math.abs(Math.sin((visualTick + index) * 0.58)) * 22 : 0;
        const volumeBoost = volumeLevel * (52 - Math.abs(7.5 - index) * 2.4);
        const speechBoost = assistantSpeaking ? 10 : 0;

        return Math.max(liveBase, Math.round(liveBase + wave + volumeBoost + speechBoost));
      }),
    [assistantSpeaking, callState, visualTick, volumeLevel],
  );

  useEffect(() => {
    if (!visiblePersonas.some((persona) => persona.slug === selectedSlug) && visiblePersonas[0]) {
      setSelectedSlug(visiblePersonas[0].slug);
    }
  }, [activeRole, selectedSlug, visiblePersonas]);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setCallState('live');
      setSecondsRemaining(MAX_DEMO_SECONDS);
      setStatusLabel('Live browser test connected. Talk naturally and watch the response move in real time.');
      setErrorLabel('');
    };

    const handleCallEnd = () => {
      setCallState('idle');
      setAssistantSpeaking(false);
      setVolumeLevel(0);
      setSecondsRemaining(MAX_DEMO_SECONDS);

      const endReason = endReasonRef.current ?? 'completed';
      const nextStatus =
        endReason === 'timeout'
          ? 'The 45 second preview finished. Drop your details and book the full walkthrough.'
          : 'Demo finished. Drop your details and grab a booking slot if you want the full build scoped out.';

      setStatusLabel(nextStatus);

      if (shouldPromptLeadCaptureRef.current && endReason !== 'cleanup' && endReason !== 'error') {
        setShowLeadCapture(true);
      }

      shouldPromptLeadCaptureRef.current = false;
      endReasonRef.current = null;
    };

    const handleSpeechStart = () => {
      setAssistantSpeaking(true);
    };

    const handleSpeechEnd = () => {
      setAssistantSpeaking(false);
    };

    const handleVolumeLevel = (volume: number) => {
      setVolumeLevel(Math.max(0, Math.min(1, volume)));
    };

    const handleMessage = (message: { type?: string; role?: 'assistant' | 'user'; transcript?: string }) => {
      if (message.type !== 'transcript') {
        return;
      }

      const { role, transcript } = message;
      if ((role !== 'assistant' && role !== 'user') || typeof transcript !== 'string' || transcript.length === 0) {
        return;
      }

      setTranscripts((current) => [
        ...current.slice(-7),
        {
          id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: transcript,
        },
      ]);
    };

    const handleError = (error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Unable to start the browser call.';
      setCallState('idle');
      setAssistantSpeaking(false);
      setVolumeLevel(0);
      setSecondsRemaining(MAX_DEMO_SECONDS);
      shouldPromptLeadCaptureRef.current = false;
      endReasonRef.current = 'error';
      setErrorLabel(detail);
      setStatusLabel('The live test did not connect. Try again or switch personas.');
    };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('volume-level', handleVolumeLevel);
    vapi.on('speech-start', handleSpeechStart);
    vapi.on('speech-end', handleSpeechEnd);
    vapi.on('message', handleMessage);
    vapi.on('error', handleError);

    return () => {
      shouldPromptLeadCaptureRef.current = false;
      endReasonRef.current = 'cleanup';
      vapi.removeAllListeners();
      void vapi.stop().catch(() => undefined);
      vapiRef.current = null;
    };
  }, [publicKey]);

  useEffect(() => {
    if (callState !== 'live') {
      return;
    }

    if (secondsRemaining <= 0) {
      void stopSelectedPersona('timeout');
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [callState, secondsRemaining]);

  useEffect(() => {
    if (callState !== 'live') {
      setVisualTick(0);
      return;
    }

    const timer = window.setInterval(() => {
      setVisualTick((current) => current + 1);
    }, 120);

    return () => window.clearInterval(timer);
  }, [callState]);

  async function startSelectedPersona() {
    if (!publicKey || !selectedPersona?.assistantId || !vapiRef.current) {
      return;
    }

    shouldPromptLeadCaptureRef.current = true;
    endReasonRef.current = null;
    setCallState('connecting');
    setShowLeadCapture(false);
    setSecondsRemaining(MAX_DEMO_SECONDS);
    setVolumeLevel(0);
    setStatusLabel(`Connecting ${selectedPersona.headline.toLowerCase()}...`);
    setErrorLabel('');
    setTranscripts([]);

    try {
      await vapiRef.current.start(selectedPersona.assistantId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to start the live browser call.';
      setCallState('idle');
      setStatusLabel('The live test could not start.');
      setErrorLabel(detail);
    }
  }

  async function stopSelectedPersona(reason: 'manual' | 'timeout' = 'manual') {
    if (!vapiRef.current) {
      return;
    }

    endReasonRef.current = reason;
    setCallState('ending');
    setStatusLabel(
      reason === 'timeout' ? 'Wrapping the 45 second preview and preparing your next step...' : 'Ending the current browser test...',
    );

    try {
      await vapiRef.current.stop();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to stop the live browser call.';
      setCallState('idle');
      setErrorLabel(detail);
    }
  }

  function handleLeadFieldChange(field: keyof typeof leadForm, value: string) {
    setLeadForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSelectorKeyDown(event: KeyboardEvent<HTMLElement>, slug: string) {
    if (demoIsLocked) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedSlug(slug);
    }
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        LEAD_CAPTURE_STORAGE_KEY,
        JSON.stringify({
          ...leadForm,
          persona: selectedPersona?.headline ?? '',
          role: selectedPersona?.role ?? activeRole,
          submittedAt: new Date().toISOString(),
        }),
      );
      window.location.assign(BOOKING_LINK);
    }
  }

  return (
    <>
      <div className="voice-persona-shell">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Interactive voice demos</span>
          </div>
          <p>
            Let prospects compare inbound and outbound styles, hear the pacing live, and move into the exact voice that
            matches how your team should sound before they book.
          </p>
        </div>

        <div className="voice-persona-toolbar">
          <div className="voice-pill-row">
            <button
              className={`voice-persona-tab ${activeRole === 'inbound' ? 'is-active' : ''}`}
              disabled={demoIsLocked}
              onClick={() => setActiveRole('inbound')}
              type="button"
            >
              Inbound personas
            </button>
            <button
              className={`voice-persona-tab ${activeRole === 'outbound' ? 'is-active' : ''}`}
              disabled={demoIsLocked}
              onClick={() => setActiveRole('outbound')}
              type="button"
            >
              Outbound personas
            </button>
          </div>

          <div className="voice-persona-toolbar-copy">
            <span>Pick a voice</span>
            <strong>Select a persona, flip into preview mode, then launch the 45 second live demo</strong>
          </div>
        </div>

        <div className="voice-persona-layout">
          <div className="voice-selector-grid">
            {visiblePersonas.map((persona) => {
              const isSelected = selectedPersona?.slug === persona.slug;
              const isActiveDemo = isSelected && demoIsLocked;

              return (
                <article
                  key={persona.slug}
                  aria-pressed={isSelected}
                  className={`voice-persona-selector ${isSelected ? 'is-selected' : ''} ${isActiveDemo ? 'is-demo-active' : ''}`}
                  onClick={() => {
                    if (!demoIsLocked) {
                      setSelectedSlug(persona.slug);
                    }
                  }}
                  onKeyDown={(event) => handleSelectorKeyDown(event, persona.slug)}
                  role="button"
                  tabIndex={demoIsLocked ? -1 : 0}
                >
                  <div className="voice-persona-selector-inner">
                    <div className="voice-persona-selector-face voice-persona-selector-front">
                      <div className="voice-persona-card-top">
                        <span className="voice-section-eyebrow">{roleLabel(persona.role)}</span>
                        <span className="voice-persona-chip">{persona.voiceId}</span>
                      </div>
                      <h3>{persona.headline}</h3>
                      <p>{persona.preview}</p>
                      <div className="voice-persona-meta">
                        <span>{persona.tone}</span>
                        <span>{persona.assistantId ? 'Live' : 'Pending'}</span>
                      </div>
                    </div>

                    <div className="voice-persona-selector-face voice-persona-selector-back">
                      <div className="voice-persona-card-top">
                        <span className="voice-section-eyebrow">Ready to demo</span>
                        <span className="voice-persona-chip">{persona.role.toUpperCase()}</span>
                      </div>
                      <div className="voice-selector-back-copy">
                        <h3>{persona.headline}</h3>
                        <p>{persona.firstMessage}</p>
                      </div>
                      <div className="voice-selector-back-meta">
                        <span>{persona.tone}</span>
                        <span>45 second preview</span>
                      </div>
                      <button
                        className="voice-selector-start"
                        disabled={!publicKey || !persona.assistantId || demoIsLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedSlug(persona.slug);
                          void startSelectedPersona();
                        }}
                        type="button"
                      >
                        <Mic size={16} />
                        Start demo
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="glass-card voice-demo-stage">
            <div className="voice-demo-stage-head">
              <div>
                <span className="voice-section-eyebrow">Live voice preview</span>
                <h3>{selectedPersona?.headline ?? 'Persona unavailable'}</h3>
              </div>
              <div className={`voice-persona-live ${callState === 'live' ? 'is-live' : ''}`}>
                <Radio size={14} />
                <span>{callState === 'live' ? 'Live' : callState === 'connecting' ? 'Connecting' : 'Ready'}</span>
              </div>
            </div>

            <div className="voice-demo-stage-meta">
              <div className="voice-demo-stage-pill">
                <span>{roleLabel(selectedPersona?.role ?? activeRole)}</span>
                <strong>{selectedPersona?.voiceId ?? 'Voice not set'}</strong>
              </div>
              <div className="voice-demo-stage-pill">
                <span>Timer</span>
                <strong>{formattedTimer}</strong>
              </div>
            </div>

            <div className="voice-demo-visual">
              <div className={`voice-demo-orb ${callState === 'live' ? 'is-live' : ''} ${assistantSpeaking ? 'is-speaking' : ''}`}>
                <Waves size={28} />
              </div>

              <div className="voice-demo-waveform" aria-hidden="true">
                {audioBars.map((height, index) => (
                  <span
                    key={`${selectedPersona?.slug ?? 'persona'}-${index}`}
                    className={callState === 'live' ? 'is-live' : ''}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>

              <div className="voice-demo-countdown">
                <div className="voice-demo-countdown-copy">
                  <span>Demo window</span>
                  <strong>{callState === 'live' ? 'Live preview running' : 'Starts when you press demo'}</strong>
                </div>
                <div className="voice-demo-countdown-track">
                  <span style={{ width: countdownPercent }} />
                </div>
              </div>
            </div>

            <div className="voice-persona-facts">
              <div>
                <span className="voice-section-eyebrow">Tone</span>
                <strong>{selectedPersona?.tone ?? 'Not set'}</strong>
              </div>
              <div>
                <span className="voice-section-eyebrow">Voice</span>
                <strong>{selectedPersona ? `${selectedPersona.voiceId} with ${selectedPersona.fallbackVoiceId} fallback` : 'Not set'}</strong>
              </div>
              <div>
                <span className="voice-section-eyebrow">Open</span>
                <strong>{selectedPersona?.firstMessage ?? 'Not set'}</strong>
              </div>
            </div>

            <div className="voice-cta-row">
              <button
                className="voice-primary-button"
                disabled={!publicKey || !selectedPersona?.assistantId || callState === 'connecting' || callState === 'ending'}
                onClick={() => void startSelectedPersona()}
                type="button"
              >
                <Mic size={18} />
                {callState === 'connecting' ? 'Connecting...' : callState === 'live' ? 'Demo live' : 'Start 45 sec demo'}
              </button>
              <button
                className="voice-secondary-button"
                disabled={callState !== 'live' && callState !== 'connecting'}
                onClick={() => void stopSelectedPersona('manual')}
                type="button"
              >
                <PhoneOff size={18} />
                Stop test
              </button>
            </div>

            <div className="voice-persona-status-row">
              <div className="voice-persona-status">
                <Sparkles size={16} />
                <span>{statusLabel}</span>
              </div>
              <div className={`voice-persona-status ${assistantSpeaking ? 'is-speaking' : ''}`}>
                <Volume2 size={16} />
                <span>{assistantSpeaking ? 'Assistant speaking' : callState === 'live' ? 'Listening for the next turn' : 'Waiting for demo start'}</span>
              </div>
            </div>

            {errorLabel ? <p className="notice error-notice">{errorLabel}</p> : null}

            <div className="voice-persona-transcript-wrap">
              <div className="voice-demo-stage-head is-compact">
                <span className="voice-section-eyebrow">Transcript stream</span>
                <span className="voice-persona-chip">Latest turns</span>
              </div>

              <div className="voice-persona-transcript-list">
                {transcripts.length ? (
                  transcripts.map((entry) => (
                    <div key={entry.id} className={`voice-persona-transcript ${entry.role === 'assistant' ? 'is-assistant' : 'is-user'}`}>
                      <span className="voice-transcript-role">{entry.role === 'assistant' ? 'Assistant' : 'Visitor'}</span>
                      <p>{entry.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="voice-persona-empty">
                    <p>Choose a persona card to arm the demo. Once it goes live, the waveform and transcript update in real time.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showLeadCapture ? (
        <div aria-labelledby="voice-demo-lead-title" aria-modal="true" className="voice-lead-modal-backdrop" role="dialog">
          <div className="voice-lead-modal">
            <div className="voice-lead-modal-head">
              <div>
                <span className="voice-section-eyebrow">Next step</span>
                <h3 id="voice-demo-lead-title">Want your own voice agent buildout?</h3>
              </div>
              <button className="voice-lead-close" onClick={() => setShowLeadCapture(false)} type="button">
                Maybe later
              </button>
            </div>

            <p>
              Drop your details and we&apos;ll take you straight to the booking page for a scoped walkthrough around
              your business.
            </p>

            <form className="voice-lead-form" onSubmit={handleLeadSubmit}>
              <div className="voice-lead-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    name="name"
                    onChange={(event) => handleLeadFieldChange('name', event.target.value)}
                    placeholder="Your name"
                    required
                    value={leadForm.name}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    name="email"
                    onChange={(event) => handleLeadFieldChange('email', event.target.value)}
                    placeholder="you@company.com"
                    required
                    type="email"
                    value={leadForm.email}
                  />
                </label>
                <label className="field">
                  <span>Company</span>
                  <input
                    name="company"
                    onChange={(event) => handleLeadFieldChange('company', event.target.value)}
                    placeholder="Company name"
                    required
                    value={leadForm.company}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    onChange={(event) => handleLeadFieldChange('phone', event.target.value)}
                    placeholder="Best callback number"
                    required
                    value={leadForm.phone}
                  />
                </label>
              </div>

              <div className="voice-lead-actions">
                <p>Submit your details and we&apos;ll hand you straight to the booking link.</p>
                <button className="voice-primary-button" type="submit">
                  Submit
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
