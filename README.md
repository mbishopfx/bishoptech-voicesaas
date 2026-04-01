# Vapi Voice Ops SaaS (Admin + Client)

Production-oriented scaffold for a multi-tenant SaaS dashboard to sell/manage Vapi-powered voice assistants for SMBs.

## What this project includes

- **Admin-facing control plane**
  - Create client accounts/tenants
  - Spin up assistants quickly from hardened templates
  - Manage voice presets, prompt packs, and rollout defaults
  - Track calls, outcomes, errors, and client-level usage

- **Client-facing portal**
  - Edit allowed assistant settings (system messages, behaviors, booking rules, business context)
  - See call outcomes and missed-call/after-hours intake metrics
  - Embedded AI helper scoped to DIY guidance + support escalation

- **Agentic docs assistant**
  - LangChain + xAI model integration
  - Admin scope: full implementation/operator guidance
  - Client scope: constrained guidance + “contact support” workflows

- **Supabase-first backend model**
  - SQL migrations for multi-tenant entities
  - RLS-ready table layout
  - Audit/event tracking for regulated client operations

- **Deployment targets**
  - **Vercel**: web app
  - **Railway**: workers/background jobs/webhooks processors

## What was added in this build pass

- Production-shaped Next.js app shell for the admin surface, client portal, and operator copilot
- Gemini-powered demo template route that accepts website + GBP raw text and returns a full assistant pack
- Vapi demo-call route that creates the assistant under one shared Vapi account and triggers an outbound test call
- Visual workflow canvas with drag, link, and Mermaid export/preview
- Schema extensions for demo blueprints, workflow boards, and client-facing downloadable assets
- Admin onboarding route that creates the client auth user plus an inbound, outbound, and specialist assistant stack
- Client blast-campaign route that parses CSV uploads, normalizes phone numbers, and launches outbound list blasts

---

## Folder layout

- `apps/web` — Next.js dashboard app (admin + client + API routes)
- `supabase/migrations` — SQL schema + security baseline
- `docs` — architecture, capabilities matrix, handoff notes
- `templates` — assistant prompt/voice starter kits
- `infra` — deployment and runtime notes

---

## Current status

This is a **handoff-ready foundation** with schema + architecture + implementation rails.
Use this as the base for Codex to execute full production build/deployment.

See `docs/HANDOFF_TO_CODEX.md` first.
