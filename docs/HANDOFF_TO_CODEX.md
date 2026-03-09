# Handoff to Codex

You can pass this whole folder to Codex and use this prompt:

---

Build this into a production-ready multi-tenant SaaS for Vapi voice assistant operations.

Requirements:
1. Keep current architecture and table model, but harden for production.
2. Implement full auth/RLS role enforcement for admin vs client scope.
3. Build complete admin UI + client UI with liquid-metal high-performance design system.
4. Implement assistant CRUD syncing with Vapi API with retries/idempotency.
5. Add webhook ingestion service for call events + outcomes + booking extraction.
6. Add analytics dashboards (admin + client scoped).
7. Build role-scoped AI docs copilot using LangChain + xAI.
8. Add comprehensive tests and docs.
9. Prepare deploy configs for Vercel + Railway + Supabase.

Critical non-functional requirements:
- tenant isolation correctness > speed
- strict secret handling
- full audit logging for write operations
- excellent UX and loading performance

---

## Immediate TODO checklist

- [ ] Replace placeholder auth middleware with Supabase SSR auth guards
- [ ] Implement robust Vapi SDK wrapper + typed contracts
- [ ] Add queue/retry strategy for Vapi operations
- [ ] Build template manager (prompt packs + voice presets)
- [ ] Add import/seed scripts for initial templates
- [ ] Add docs ingestion pipeline for Vapi docs into help assistant context
- [ ] Add support handoff workflow in client helper

## Notes

- This scaffold intentionally prioritizes structure + migration correctness + handoff speed.
- Expand from here rather than rebuilding from zero.
