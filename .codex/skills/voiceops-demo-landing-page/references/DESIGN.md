# Vertical Demo Landing Page Design

Use this as the canonical page brief when building a prospect-facing voice demo page.

## Page Contract

- `businessName`: display name for the business
- `vertical`: med spa, dental, legal, home services, etc.
- `assistantId`: Vapi assistant ID to embed
- `shareUrl`: canonical live URL to send by email, text, or QR
- `primaryCta`: `Book demo`, `Call live`, `Request callback`, or `Scan QR`
- `bookingMode`: `direct-booking`, `message-only`, or `hybrid`

## Required Experience

The page must do four jobs:

1. Make the assistant feel real in the first 3 seconds.
2. Let a visitor try the assistant without hunting for controls.
3. Show what happened after the test call.
4. Sell the voice bot as a product, not just a novelty.

## Layout

### 1. Hero

- Big vertical-specific headline
- Short supporting line that explains the result
- Primary CTA and secondary CTA
- Share controls near the CTA row
- QR preview or QR download button

### 2. Live Demo Panel

- Embed the assistant using `assistantId`
- Show a clear online/ready state
- Animate an audio waveform or voice-reactive visualization
- Show current call state: idle, listening, speaking, completed
- Keep the panel visually dominant

### 3. Post-Call Results

- Transcript viewer
- Summary box
- Export actions
- Retry / run again action
- Optional lead capture note if the caller asked for follow-up

### 4. Feature Grid

Include the products and capabilities being sold, for example:

- Answer questions
- Book appointments
- Take messages
- Qualification and lead capture
- FAQ automation
- Call transfers and handoff
- SMS or email follow-up
- Analytics and call summaries

### 5. Value Section

- Show why the voice bot matters for that vertical
- Use concrete business outcomes, not abstract AI language
- Keep the copy specific to the industry

### 6. Final CTA

- Ask the visitor to book a demo, send the page, or scan the QR
- Repeat the business value in one sentence

## Interaction Rules

- The page route should accept `assistantId` and any optional branding overrides.
- The same URL should work for email and QR sharing.
- The assistant widget should be the first interactive element.
- On test completion, reveal transcript and export actions immediately.
- If the assistant does not support direct booking, route to message capture instead.

## Visual Direction

- Use a bold, intentional layout with strong hierarchy.
- Avoid generic SaaS cards and bland white-space-heavy composition.
- Let the audio visualization become a focal object, not a decorative afterthought.
- Use motion sparingly but meaningfully:
  - intro reveal
  - waveform activity
  - call-state transitions
  - transcript streaming
- Make the page feel like a premium demo instrument and a sales asset at the same time.

## Copy Rules

- Lead with outcome, not implementation.
- Mention the assistant by role, not by internal jargon.
- Use the vertical's language.
- Keep the promise concrete:
  - answer calls
  - book appointments
  - capture leads
  - route messages
- Avoid inflated claims or fake metrics.

## Acceptance Criteria

- The page works on mobile and desktop.
- The share URL is copyable.
- The QR code points to the same live page.
- The assistant widget loads from the provided `assistantId`.
- The audio visualization animates during interaction.
- The transcript and export controls appear after the test.
- The feature section makes the offer understandable in under a minute.
- The final CTA is obvious and easy to use.

## Suggested Page Skeleton

```md
# [Business Name] Voice Demo

Intro line
CTA row
Share/QR strip

## Try the assistant
Live widget + audio visualization

## What happened
Transcript + summary + export

## What this bot can do
Feature grid

## Why it matters
Vertical-specific outcomes

## Next step
Book / request follow-up / scan QR
```
