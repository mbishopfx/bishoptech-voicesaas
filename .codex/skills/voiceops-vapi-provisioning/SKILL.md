---
name: voiceops-vapi-provisioning
description: Provision and maintain VoiceOps assistants, managed numbers, and publish flows with the authenticated Vapi CLI. Use when creating or syncing client stacks, checking Vapi account state, attaching managed demo numbers, or verifying assistant publish health inside this repo.
---

# VoiceOps Vapi Provisioning

Use this skill when operating the Vapi-backed control plane for this repo.

## Inputs you need

- `organizationId`
- `businessName`
- `icpPackId`
- `orchestrationMode`
- Whether the action is `draft-only` or `publish`

## Primary repo touchpoints

- App routes: `apps/web/src/app/api/admin/assistant-factory/route.ts`, `apps/web/src/app/api/admin/number-pool/route.ts`
- Assistant payload builder: `apps/web/src/lib/client-stack.ts`
- Credential resolution: `apps/web/src/lib/vapi-credentials.ts`
- Schema: `supabase/migrations/20260417_voiceops_command_center.sql`

## CLI workflow

1. Check auth/account: `~/.vapi/bin/vapi auth status`
2. Inspect assistants if needed: `~/.vapi/bin/vapi assistant list`
3. Inspect phone inventory if needed: `~/.vapi/bin/vapi phone list`
4. Use the app route first for provisioning logic so Supabase and Vapi stay aligned.
5. Only fall back to raw CLI create/update commands when debugging or repairing drift.

## Required metadata on every managed assistant

- `organizationId`
- `icpPackId`
- `managedBy=voiceops-assistant-factory`

## Failure handling

- If Vapi publish fails, keep the assistant record as draft and log the failed revision.
- If no free number exists, stop before publishing and resolve the number pool first.
- If the org uses BYO Vapi, do not reserve from the managed demo pool.
