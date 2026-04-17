---
name: voiceops-icp-authoring
description: Create or refine VoiceOps ICP packs with the required prompt structure, lead schema, grading rubric, test scenarios, voice preset, and linked operator documentation.
---

# VoiceOps ICP Authoring

Use this skill when adding or revising vertical launch packs.

## Primary repo touchpoints

- ICP source of truth: `apps/web/src/lib/icp-packs.ts`
- Shared contracts: `apps/web/src/lib/voiceops-contracts.ts`
- Dashboard consumers: `apps/web/src/lib/dashboard-data.ts`
- Docs folder: `docs/`

## Every ICP pack must include

- `id`, `slug`, `label`, `vertical`, `summary`, `positioning`
- Required and optional lead fields
- Grading rubric with weighted success definitions
- Voice preset
- Approved vs protected tool toggles
- At least two test scenarios
- Links to operator docs

## Authoring rules

- Keep the pack opinionated enough to launch quickly.
- Keep client-editable blocks separate from protected operator logic.
- Add or update the matching docs if the pack meaningfully changes.
