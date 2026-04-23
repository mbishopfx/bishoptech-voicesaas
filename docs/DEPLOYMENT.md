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

The worker now assumes a queue-backed flow:
- `public.worker_jobs` in Supabase for claimable background jobs
- `public.claim_worker_jobs(...)` for `FOR UPDATE SKIP LOCKED` claiming across replicas
- `public.worker_event_ingests` for durable webhook ingestion before normalization

Suggested worker endpoints:
- `POST /webhooks/vapi/call-events`
- `POST /jobs/blast-dispatch`

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
- `RAILWAY_WORKER_BASE_URL` — public Railway base URL used for health checks / operational visibility
- `VAPI_DEFAULT_MODEL_NAME` — default low-latency voice model for new assistants
- `VAPI_DEFAULT_VOICE_ID` — primary realistic demo voice (`marin` by default)
- `VAPI_FALLBACK_VOICE_ID` — fallback voice for resilience (`cedar` by default)
- `GEMINI_API_KEY` — Google AI Studio key for generating demo templates from raw business inputs

Worker-specific:
- `WORKER_BATCH_SIZE`
- `WORKER_POLL_INTERVAL_MS`
- `WORKER_SHARED_SECRET`
- `VAPI_WEBHOOK_SECRET`

## CI/CD suggestions

- PR checks: lint + typecheck + migration validation
- Preview deploys on Vercel for UI review
- Railway staging worker connected to staging Supabase
