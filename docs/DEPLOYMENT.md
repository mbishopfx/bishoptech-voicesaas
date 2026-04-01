# Deployment Plan (Vercel + Railway + Supabase)

## Vercel (apps/web)

- Deploy Next.js app from `apps/web`
- Configure env vars from `.env.example`
- Enable server-side routes for Vapi + AI helper

## Railway (workers)

Create a worker service for:
- Vapi webhook ingestion
- Async retries/sync jobs
- nightly analytics rollups (optional)

Suggested worker endpoints:
- `POST /webhooks/vapi/call-events`
- `POST /jobs/sync-assistants`

## Supabase

- Apply migrations in `supabase/migrations`
- Configure auth providers and redirect URLs
- Enforce RLS before client onboarding

## Secret management

Never expose:
- `VAPI_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `XAI_API_KEY`

Keep those server-side only.

## New required environment variables for demo mode

- `VAPI_DEMO_PHONE_NUMBER_ID` — Vapi phone number ID reserved for outbound live demos
- `VAPI_OUTBOUND_PHONE_NUMBER_ID` — Vapi phone number ID reserved for client blast campaigns
- `VAPI_DEFAULT_MODEL_NAME` — default low-latency voice model for new assistants
- `VAPI_DEFAULT_VOICE_ID` — primary realistic demo voice
- `VAPI_FALLBACK_VOICE_ID` — fallback voice for resilience
- `GEMINI_API_KEY` — Google AI Studio key for generating demo templates from raw business inputs

## CI/CD suggestions

- PR checks: lint + typecheck + migration validation
- Preview deploys on Vercel for UI review
- Railway staging worker connected to staging Supabase
