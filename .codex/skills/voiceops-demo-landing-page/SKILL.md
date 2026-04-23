---
name: voiceops-demo-landing-page
description: Create vertical voice-demo landing pages with an embedded assistant widget, shareable live links, animated audio visualization, transcript/export controls, QR/email sharing, and a sales feature section. Use when building or updating a prospect-facing demo microsite, assistant share page, QR landing page, or vertical demo + marketing page for a voice bot.
---

# VoiceOps Demo Landing Page

## Overview

Build a prospect-ready landing page that lets a business hear the assistant immediately, inspect the result after the call, and share the demo through a live URL or QR code.

## Inputs

- Business name and vertical
- Assistant ID to embed
- Primary CTA, usually demo, book, or request follow-up
- Brand tone and visual style
- Optional booking link, calendar target, or lead capture destination
- Optional proof points, feature bullets, or testimonial copy

## Workflow

1. Load [references/DESIGN.md](references/DESIGN.md) and use it as the page contract.
2. Choose a theme that fits the vertical, but keep the demo premium and conversion-focused.
3. Build the hero around the live assistant embed, not around generic marketing copy.
4. Wire the assistant ID into a stable shareable URL so the page can be emailed or turned into a QR code.
5. Include animated audio visualization, transcript visibility, and export actions after the test call.
6. Add a feature section that sells the voice bot capabilities clearly.
7. Finish with a strong CTA and a lightweight handoff path if booking is not fully automated.

## Required Page Elements

- Hero with business-specific headline and subhead
- Embedded assistant widget or live demo panel keyed by `assistantId`
- Animated audio visualization or waveform display
- Share actions: copy link, email link, QR code download
- Post-call panel: transcript, summary, export, retry
- Feature list for the voice bot offering
- CTA block for booking, follow-up, or next-step request

## Guardrails

- Do not fabricate live booking, transcript, or performance data.
- If the assistant cannot book directly, present a message or callback flow.
- Keep the design vertical-specific, not a generic SaaS template.
- Keep the interaction simple enough to share by email, SMS, or QR code without explanation.

## Reference Material

Use [references/DESIGN.md](references/DESIGN.md) for the exact landing-page structure, interaction model, and acceptance criteria.

## Output

Create or update the page implementation, plus any share-link or QR helper needed to make the demo easy to send.
