'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

import { BOOKING_LINK, LEAD_CAPTURE_STORAGE_KEY } from '@/lib/booking';

const CTA_DRAWER_STORAGE_KEY = 'bishoptech-booking-drawer-dismissed';
const CTA_DRAWER_DELAY_MS = 10_000;

type LeadFormState = {
  name: string;
  email: string;
  company: string;
};

const emptyLeadForm: LeadFormState = {
  name: '',
  email: '',
  company: '',
};

export function BookingCtaDrawer() {
  const [isVisible, setIsVisible] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(CTA_DRAWER_STORAGE_KEY) === 'true') {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, CTA_DRAWER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  function dismissDrawer() {
    setIsVisible(false);

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CTA_DRAWER_STORAGE_KEY, 'true');
    }
  }

  function handleFieldChange(field: keyof LeadFormState, value: string) {
    setLeadForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(
      LEAD_CAPTURE_STORAGE_KEY,
      JSON.stringify({
        ...leadForm,
        source: 'landing-drawer',
        submittedAt: new Date().toISOString(),
      }),
    );
    window.sessionStorage.setItem(CTA_DRAWER_STORAGE_KEY, 'true');
    window.location.assign(BOOKING_LINK);
  }

  return (
    <div className={`booking-cta-drawer-shell ${isVisible ? 'is-visible' : ''}`} aria-hidden={!isVisible}>
      <section aria-label="Booking call to action" className="booking-cta-drawer">
        <div className="booking-cta-copy">
          <span className="voice-section-eyebrow">Ready for your own voice layer?</span>
          <h3>Book the walkthrough and we&apos;ll map the right call flows for your team.</h3>
          <p>
            Tell us where to send the scoped follow-up, then jump straight into the calendar to lock the working
            session.
          </p>
        </div>

        <form className="booking-cta-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              onChange={(event) => handleFieldChange('name', event.target.value)}
              placeholder="Your name"
              required
              value={leadForm.name}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              onChange={(event) => handleFieldChange('email', event.target.value)}
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
              onChange={(event) => handleFieldChange('company', event.target.value)}
              placeholder="Company name"
              required
              value={leadForm.company}
            />
          </label>

          <div className="booking-cta-actions">
            <button className="voice-primary-button" type="submit">
              Submit
              <ArrowRight size={16} />
            </button>
            <button aria-label="Dismiss booking prompt" className="booking-cta-dismiss" onClick={dismissDrawer} type="button">
              <X size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
