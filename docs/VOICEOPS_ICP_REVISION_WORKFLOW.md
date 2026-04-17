# VoiceOps ICP Revision Workflow

## What can change

- Summary and positioning
- Lead field schema
- Grading rubric
- Voice preset
- Approved tool toggles
- Test scenarios

## What must stay explicit

- Protected operator-only blocks
- Compliance and safety behavior
- Recovery doc links

## Revision flow

1. Update `apps/web/src/lib/icp-packs.ts`.
2. Confirm the contract still matches `apps/web/src/lib/voiceops-contracts.ts`.
3. Update any operator docs affected by the change.
4. Re-test at least one successful and one failure scenario.
