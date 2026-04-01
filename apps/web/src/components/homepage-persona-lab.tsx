'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, PhoneOff, Radio, Sparkles, Volume2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';

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

function roleLabel(role: HomepagePersonaRole) {
  return role === 'inbound' ? 'Inbound' : 'Outbound';
}

export function HomepagePersonaLab({ publicKey, personas }: HomepagePersonaLabProps) {
  const [activeRole, setActiveRole] = useState<HomepagePersonaRole>('inbound');
  const [selectedSlug, setSelectedSlug] = useState(personas[0]?.slug ?? '');
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'live' | 'ending'>('idle');
  const [statusLabel, setStatusLabel] = useState('Pick a persona and test it live in the browser.');
  const [errorLabel, setErrorLabel] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const vapiRef = useRef<Vapi | null>(null);

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
      setStatusLabel('Live browser test connected. Talk naturally and listen for the response.');
      setErrorLabel('');
    };

    const handleCallEnd = () => {
      setCallState('idle');
      setAssistantSpeaking(false);
      setStatusLabel('Call ended. Pick another persona or run the same test again.');
    };

    const handleSpeechStart = () => {
      setAssistantSpeaking(true);
    };

    const handleSpeechEnd = () => {
      setAssistantSpeaking(false);
    };

    const handleMessage = (message: { type?: string; role?: 'assistant' | 'user'; transcript?: string }) => {
      if (message.type !== 'transcript' || !message.transcript || !message.role) {
        return;
      }

      const role = message.role;
      const transcript = message.transcript;

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
      setErrorLabel(detail);
      setStatusLabel('The live test did not connect. Try again or switch personas.');
    };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('speech-start', handleSpeechStart);
    vapi.on('speech-end', handleSpeechEnd);
    vapi.on('message', handleMessage);
    vapi.on('error', handleError);

    return () => {
      vapi.removeAllListeners();
      void vapi.stop().catch(() => undefined);
      vapiRef.current = null;
    };
  }, [publicKey]);

  async function startSelectedPersona() {
    if (!publicKey || !selectedPersona?.assistantId || !vapiRef.current) {
      return;
    }

    setCallState('connecting');
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

  async function stopSelectedPersona() {
    if (!vapiRef.current) {
      return;
    }

    setCallState('ending');
    setStatusLabel('Ending the current browser test...');

    try {
      await vapiRef.current.stop();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to stop the live browser call.';
      setCallState('idle');
      setErrorLabel(detail);
    }
  }

  return (
    <div className="voice-persona-shell">
      <div className="voice-section-head">
        <div>
          <span className="voice-section-eyebrow">Live persona lab</span>
          <h2>Ten live assistants. Five inbound. Five outbound.</h2>
        </div>
        <p>
          Let visitors hear how different inbound and outbound voices handle the same moment, then move into the exact
          persona that fits their business before they ever book the call.
        </p>
      </div>

      <div className="voice-persona-toolbar">
        <div className="voice-pill-row">
          <button
            className={`voice-persona-tab ${activeRole === 'inbound' ? 'is-active' : ''}`}
            onClick={() => setActiveRole('inbound')}
            type="button"
          >
            Inbound personas
          </button>
          <button
            className={`voice-persona-tab ${activeRole === 'outbound' ? 'is-active' : ''}`}
            onClick={() => setActiveRole('outbound')}
            type="button"
          >
            Outbound personas
          </button>
        </div>

        <div className="voice-persona-toolbar-copy">
          <span>Live testing</span>
          <strong>Browser voice demos with real transcript feedback</strong>
        </div>
      </div>

      <div className="voice-persona-layout">
        <div className="voice-persona-grid">
          {visiblePersonas.map((persona) => (
            <button
              key={persona.slug}
              className={`glass-card voice-persona-card ${selectedPersona?.slug === persona.slug ? 'is-selected' : ''}`}
              onClick={() => setSelectedSlug(persona.slug)}
              type="button"
            >
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
            </button>
          ))}
        </div>

        <aside className="glass-card voice-persona-console">
          <div className="voice-persona-console-head">
            <div>
              <span className="voice-section-eyebrow">Selected persona</span>
              <h3>{selectedPersona?.headline ?? 'Persona unavailable'}</h3>
            </div>
            <div className={`voice-persona-live ${callState === 'live' ? 'is-live' : ''}`}>
              <Radio size={14} />
              <span>{callState === 'live' ? 'Live' : callState === 'connecting' ? 'Connecting' : 'Ready'}</span>
            </div>
          </div>

          <p className="voice-persona-preview">{selectedPersona?.preview}</p>

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
              onClick={startSelectedPersona}
              type="button"
            >
              <Mic size={18} />
              {callState === 'connecting' ? 'Connecting...' : 'Talk live in browser'}
            </button>
            <button
              className="voice-secondary-button"
              disabled={callState !== 'live' && callState !== 'connecting'}
              onClick={stopSelectedPersona}
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
              <span>{assistantSpeaking ? 'Assistant speaking' : 'Waiting for speech'}</span>
            </div>
          </div>

          {errorLabel ? <p className="notice error-notice">{errorLabel}</p> : null}

          <div className="voice-persona-transcript-wrap">
            <div className="voice-persona-console-head">
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
                  <p>Start a live browser test to show the voice, pacing, and transcript quality right on the homepage.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
