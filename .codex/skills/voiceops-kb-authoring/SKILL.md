---
name: voiceops-kb-authoring
description: Turn a website, Google Business Profile, or social profile into a Vapi-ready markdown knowledge base pack plus assistant prompt, booking rules, FAQ, and test scenarios.
---

# VoiceOps KB Authoring

Use this skill when a user gives you a business URL and wants a reusable knowledge pack for a Vapi assistant.

## Goal

Build a concise, source-grounded `.md` pack that helps a Vapi assistant answer questions, book appointments, and take messages without inventing facts.

## Inputs

- Primary source URL
- Optional secondary URLs, social profiles, or GBP text
- Desired assistant behavior, usually:
  - answer questions
  - book appointments
  - take messages

## Workflow

1. Crawl the source pages that matter most.
2. Extract only high-signal facts:
   - business name
   - address
   - hours
   - phone
   - services
   - booking cues
   - safety-sensitive topics
3. Split outputs into separate markdown files.
4. Mark uncertain details as inference, not fact.
5. Build a small test pack that includes pricing, booking, and after-hours scenarios.

## Repo tool

Use [`scripts/build-vapi-kb-pack.mjs`](../../../scripts/build-vapi-kb-pack.mjs) to generate a pack from a live URL.

## Output shape

Create a folder containing:

- `00-business-overview.md`
- `01-assistant-prompt.md`
- `02-booking-and-handoff.md`
- `03-faq.md`
- `04-test-scenarios.md`
- `manifest.md`
- page-level source markdown files

## Rules

- Do not fabricate prices, policies, or booking integrations.
- Prefer short bullets over long prose.
- Keep medical language conservative.
- If the site does not confirm live scheduling, instruct the assistant to take a message and hand off.
