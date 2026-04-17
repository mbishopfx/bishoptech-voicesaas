---
name: voiceops-single-lead-enrichment
description: Run a single cost-controlled enrichment for one lead at a time, using the captured lead data plus Apify when configured, then merge the result back into the VoiceOps lead pipeline.
---

# VoiceOps Single Lead Enrichment

Use this skill for one record only. Do not batch.

## Primary repo touchpoints

- Enrichment helper: `apps/web/src/lib/lead-ops.ts`
- Client enrichment route: `apps/web/src/app/api/client/leads/[leadId]/enrich/route.ts`
- Contacts storage: `contacts.metadata`
- Schema: `supabase/migrations/20260417_voiceops_command_center.sql`

## Workflow

1. Load the contact record and existing metadata.
2. Verify the user has access to the organization.
3. Run Apify only if `APIFY_API_TOKEN` and `APIFY_LEAD_ENRICH_ACTOR_ID` are configured.
4. If Apify is unavailable, write a clearly labeled fallback enrichment instead of failing silently.
5. Persist the enrichment run and update the contact metadata with status, summary, and payload.

## Cost-control rules

- One click equals one lead.
- Never fan out to multiple leads from this skill.
- Surface partial enrichment honestly when confidence is low.
