---
name: voiceops-lead-recovery
description: Recover lead data from failed or partial voice calls by inspecting transcripts, running Gemini fallback extraction, and writing confidence-scored recovery records back into the VoiceOps pipeline.
---

# VoiceOps Lead Recovery

Use this skill when structured lead output is missing, malformed, or incomplete.

## Primary repo touchpoints

- Recovery helper: `apps/web/src/lib/lead-ops.ts`
- Admin recovery route: `apps/web/src/app/api/admin/lead-recovery/route.ts`
- Worker ingest endpoint: `apps/worker/server.mjs`
- Schema: `supabase/migrations/20260417_voiceops_command_center.sql`

## Workflow

1. Pull the transcript and summary for the failed call.
2. Use the ICP pack to determine the required lead fields.
3. Run Gemini fallback extraction through the repo helper.
4. If confidence is below threshold, mark the run as `needs-review`.
5. Persist the recovery run and attach any promoted fields to the lead/contact record.

## Output contract

- `provider`
- `status`
- `confidence`
- `missingFields`
- `extractedLead`
- `notes`

## Guardrails

- Do not invent unsupported claims or legal/medical facts.
- Prefer partial but true data over complete but speculative data.
