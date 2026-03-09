# Vapi Capability Matrix (Dashboard vs Manual)

Use this to decide what is directly editable in-platform and what should show guided instructions.

## In-platform (target)

- Assistant creation/update/delete
- System prompt + first message
- Model settings supported by API
- Tool definitions that map cleanly to structured JSON
- Voice selection from approved profile library
- Call metadata/outcome sync
- Webhook-based event ingestion

## In-platform with guardrails

- Prompt edits by clients (sectioned editor, banned tokens, save-as-draft)
- Transfer/escalation behavior (validated routing patterns)
- Booking flow config (calendar target + required fields)

## Usually manual or partially manual

- Phone number purchase/provisioning steps that require console-only actions
- Region-specific telephony/legal setup details
- Edge-case provider-specific debugging

## Dashboard instruction UX pattern for manual tasks

For each non-automatable task, show:
1. **Why this is manual**
2. **Exact steps in Vapi console**
3. **Validation checklist**
4. **How to return and confirm in dashboard**
5. **Support escalation CTA**

## Prompt template strategy

- Keep “golden” vertical templates admin-owned
- Let clients edit only allowed blocks:
  - business identity
  - offer details
  - FAQ snippets
  - tone presets
- Keep protected blocks immutable:
  - compliance language
  - safety/escation logic
  - tool invocation constraints
