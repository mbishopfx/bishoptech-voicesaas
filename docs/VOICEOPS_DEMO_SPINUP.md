# VoiceOps Demo Spinup

## Goal

Create a convincing live demo without losing number inventory or creating Vapi/Supabase drift.

## Steps

1. Choose the ICP pack.
2. Verify a free managed demo number exists.
3. Provision the stack through Assistant Factory.
4. Queue a demo session with the scenario label and target phone number.
5. Launch the live proof call only after sync is healthy.
6. Attach the resulting call id back to the session when available.

## Rules

- Do not launch a live demo if the number pool is empty.
- Do not use bulk blast logic for proof calls.
- Use the same ICP pack across the demo session, assistant metadata, and recovery workflow.
