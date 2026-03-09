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
- `SUPABASE_SERVICE_ROLE_KEY`
- `XAI_API_KEY`

Keep those server-side only.

## CI/CD suggestions

- PR checks: lint + typecheck + migration validation
- Preview deploys on Vercel for UI review
- Railway staging worker connected to staging Supabase
