# VoiceOps Operator Guide

## Purpose

Run the platform like an operating system for revenue, not a static dashboard.

## Core loops

1. Pick the right ICP pack before provisioning anything.
2. Reserve a managed demo number before launching live tests.
3. Publish only after the assistant metadata includes `organizationId` and `icpPackId`.
4. Review failed structured outputs every day.
5. Promote only recovered leads with enough confidence to act on.

## Primary surfaces

- Admin command center: portfolio state, ICP packs, assistant factory, number pool, recovery queue, playbooks.
- Client console: overview, agent studio, lead pipeline, call explorer, playground.

## Non-negotiables

- Supabase is the source of truth.
- Managed Vapi is the default happy path for demos.
- Client edits stay inside approved guardrails.
- Single-lead enrichment only.
