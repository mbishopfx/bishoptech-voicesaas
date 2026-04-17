# VoiceOps Lead Recovery Runbook

## When to use

- Structured output missing
- Structured output malformed
- Critical lead fields absent

## Recovery ladder

1. Trust structured output when it is complete.
2. Run transcript recovery with Gemini when structure is missing or weak.
3. Escalate to operator QA when confidence is low.

## Required outputs

- Recovery provider
- Confidence score
- Missing fields
- Extracted lead payload
- Notes explaining what was or was not recoverable

## Rule

Partial truth beats fabricated completeness.
