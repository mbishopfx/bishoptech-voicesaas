# Weekly Product Review

**Date:** 2026-04-01  
**Project:** Vapi Voice Ops SaaS Dashboard

## Repo/Product Snapshot

Current repo shape points to a fast-moving product expansion:

- `apps/web` is the main product surface on Next.js 15 + React 19.
- `apps/worker` suggests background job / orchestration support.
- `supabase/migrations/*` indicates the backend/data model is actively being shaped for org auth, demo canvas extensions, and assistant stack / blast workflows.
- Product surface now spans:
  - marketing / launch (`/`, `/launch`, `docs/LANDING_PAGE_COPY.md`)
  - admin ops (`/admin`, `/admin/onboarding`, `/admin/workflow`, `/admin/demo-lab`, `/admin/organizations`, `/admin/calls`)
  - client workspace (`/client`, `/client/agents`, `/client/calls`, `/client/campaigns`, `/client/leads`, `/client/workflow`)
  - API routes for assistant chat, demo calls, templates, workflow boards, blast campaigns, and admin onboarding.

## Recent Change Read

Git history is still very early:

- only one committed scaffold baseline is visible
- a large amount of product work is currently sitting as modified / untracked local changes

That usually means the product surface is expanding faster than its packaging story. The build appears to be gaining capability, but the single biggest commercial risk is not missing another feature — it is shipping a broad surface without a brutally clear first-run path.

## Highest-Leverage Recommendation

### Build and tighten a single **guided activation path**

**Recommendation:** Make the primary sellable product story:

1. **Create your org**  
2. **Pick a proven assistant template**  
3. **Run a demo call**  
4. **Review workflow board + call result**  
5. **Launch first live workflow / campaign**

This should be the dominant path across marketing, onboarding, and the in-app experience.

### Why this is the highest leverage move

Right now the repo suggests strong capability breadth, but breadth alone does not sell or convert.

The win is not “more surface area.” The win is:

- faster time-to-value for first-time users
- a cleaner client demo narrative
- easier sales calls
- better perceived product maturity
- less confusion between admin-only power features and the core buyer journey

For this category, **activation clarity beats feature volume**.

If a buyer cannot understand the exact first 5 minutes, the product will feel like an internal ops tool instead of a polished SaaS offer.

## Operator Notes

### Product risk seen this week

The current structure likely mixes three layers too closely:

- marketing promise
- internal operator tooling
- client-facing workspace

That is common in early SaaS builds, but it hurts sellability if the user cannot quickly tell:

- what the product does
- what they should do first
- what outcome they get by the end of onboarding
- what is “setup” vs “daily use” vs “advanced ops”

### Packaging direction

The product should feel like:

- **Voice Ops launchpad** for clients
- **Operator console** for internal/admin users
- **Template-driven deployment system** under the hood

Those are distinct layers and should be messaged distinctly.

## Best Next Move

Within the next build pass, implement or tighten these in order:

1. **One canonical CTA path** from landing page to onboarding
   - one primary CTA
   - one promised outcome
   - one first-run flow

2. **Template-first onboarding**
   - do not start from a blank state
   - let users choose a role/use case/template first

3. **Visible first-win checkpoint**
   - “Your assistant is ready”
   - “Your demo call ran”
   - “Your workflow board is populated”
   - “You are ready to launch”

4. **Separate advanced/admin surfaces from first-run client flow**
   - avoid making power-user routes feel like the main product

## This Week’s Decision

**Do not prioritize another major feature next.**  
Prioritize **activation packaging** and the **guided first-run experience**.

That is the single highest-leverage improvement for client-facing quality, production readiness, onboarding clarity, and sellability.

## Suggested Acceptance Criteria

A new visitor or demo prospect should be able to:

- understand the offer in under 10 seconds
- click one main CTA
- complete a guided setup without ambiguity
- see a meaningful first result before leaving the product
- understand what to do next after the demo / onboarding step
