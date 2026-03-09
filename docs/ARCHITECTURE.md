# Architecture Blueprint

## 1) Product surfaces

### Admin surface (you)
- Tenant + client provisioning
- Fast assistant creation from prebuilt vertical templates
- Voice template assignment (pre-approved realistic presets)
- Global policy guardrails (compliance phrases, escalation behavior)
- Event analytics + QA pipeline + prompt/version audit trail

### Client surface (customer)
- Scoped assistant editor
  - business context
  - system message blocks (safe sections)
  - FAQ and call handling preferences
  - booking/missed-call workflows
- Performance visibility
  - missed call recovery
  - booked appointments
  - call disposition trends
- Embedded docs copilot scoped to DIY tasks

## 2) Core backend components

- **Next.js app (Vercel)**
  - UI + route handlers
  - role-aware server actions/API
- **Supabase**
  - auth + postgres + RLS
  - event data + settings + audit logs
- **Railway worker(s)**
  - webhook ingestion from Vapi
  - async sync jobs
  - background enrichment + reporting jobs
- **Vapi API**
  - assistant lifecycle + call operations
- **LangChain + xAI**
  - docs copilot orchestration
  - role-specific response guardrails

## 3) Recommended runtime flow

1. Admin creates tenant/client
2. Admin chooses template pack + voice profile
3. Platform creates Vapi assistant and stores `vapi_assistant_id`
4. Phone/channel config is attached
5. Calls stream to webhook worker
6. Worker normalizes/stores events in Supabase
7. Dashboards query aggregated outcomes
8. AI docs helper answers questions with role-based constraints

## 4) Security model

- Multi-tenant isolation via RLS
- App-role gates (`platform_admin`, `tenant_admin`, `tenant_member`, `client_readonly`)
- API keys only server-side
- Full change audit for prompts/system messages
- Never expose direct Vapi mutating endpoints to unrestricted client roles

## 5) UI design intent: “hyper-fluid liquid metal”

Implement with:
- layered gradient mesh backgrounds
- subtle blur glass panels + reflective highlights
- spring-driven micro interactions
- low-latency transitions (Framer Motion + CSS vars)
- avoid heavy video backgrounds in core dashboard routes for performance

Design tokens recommended:
- `--bg-0: #07090f`
- `--bg-1: #0f1424`
- `--metal-1: #b6c2ff`
- `--metal-2: #6e86ff`
- `--accent: #40e0d0`

## 6) Immediate next implementation milestones

1. Auth + membership middleware
2. Assistant CRUD with Vapi sync + error handling
3. Webhook pipeline and event normalization
4. Metrics pages and client-safe settings editor
5. AI docs ingestion + retrieval + scoped response policy
