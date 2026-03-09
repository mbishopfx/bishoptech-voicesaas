# Vapi Docs Ingestion Plan (Auto-load into Platform)

## Goal
Seed the in-app AI copilot with authoritative Vapi docs so admin/client assistants can answer platform questions safely.

## Source
- Primary docs index: https://docs.vapi.ai/
- Ingestion strategy should crawl selected high-value routes first:
  1. assistants core concepts
  2. tools + default tools
  3. knowledge base
  4. customization (voice/transcriber)
  5. observability/evals/simulations

## Ingestion pipeline

1. **Crawler job** (Railway worker)
   - Pull docs pages list (from index and/or curated allowlist)
   - Fetch markdown/raw docs content
2. **Normalization**
   - strip nav noise, preserve headings + code examples
   - annotate each chunk with source URL and section title
3. **Chunking**
   - chunk by headings and token limits
4. **Embedding + storage**
   - store chunks in Supabase (`knowledge_sources` + embeddings table)
5. **Retrieval in chat**
   - role-aware retrieval filter:
     - admin: full docs set
     - client: docs subset + your policy layer

## Client safety policy

- Clients should not receive unsafe/invasive operator instructions.
- If requested action is outside client dashboard scope:
  - give concise explanation
  - provide dashboard-safe alternative
  - offer support handoff

## Suggested first ingestion allowlist

- /assistants/quickstart
- /assistants/concepts/transient-vs-permanent-configurations
- /tools
- /tools/default-tools
- /knowledge-base
- /assistants/examples/appointment-scheduling
- /observability/evals-quickstart

## Next build step

Implement a Railway job:
- `jobs/ingest-vapi-docs.ts`
- runs nightly + manual admin trigger
- updates `knowledge_sources.embedding_status`
