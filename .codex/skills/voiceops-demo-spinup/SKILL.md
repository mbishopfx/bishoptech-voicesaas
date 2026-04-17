---
name: voiceops-demo-spinup
description: Spin up a safe managed demo for a client or prospect: reserve a demo number, create the right ICP-aligned assistant stack, queue a test session, and launch a proof call only after the stack is ready.
---

# VoiceOps Demo Spinup

Use this skill for demo orchestration, not permanent production rollout.

## Inputs you need

- `organizationId`
- `icpPackId`
- `targetPhoneNumber`
- `scenarioLabel`
- `assignedNumberLabel`

## Primary repo touchpoints

- Demo session route: `apps/web/src/app/api/admin/demo-sessions/route.ts`
- Playground route: `apps/web/src/app/api/client/playground/route.ts`
- Demo call launcher: `apps/web/src/app/api/demo-call/route.ts`
- Number reservations: `apps/web/src/app/api/admin/number-pool/route.ts`

## Workflow

1. Check number pool availability first.
2. Create or verify the assistant stack for the chosen ICP pack.
3. Queue the demo session record in Supabase.
4. Launch the actual call only after assistant sync is healthy.
5. Capture resulting call id and attach it back to the session when available.

## Cost-control rules

- One reserved number per active demo session.
- Release stale demo reservations quickly.
- Prefer replaying existing completed demo sessions before creating fresh live calls.
