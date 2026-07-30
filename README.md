# Skew

Automated, AI-powered news platform for **retail traders** doing **pre-trade research** on US equities and ETFs.

Skew gathers news from a curated set of sources, clusters coverage into **stories**, scores **bias** (bullish ↔ bearish) and **sentiment** (tone) per instrument, and serves results in a near-real-time **dashboard**. It does **not** issue trade recommendations.

## Status

Early project setup: domain language and architecture decisions are documented; application code is not scaffolded yet.

## Docs

- [`CONTEXT.md`](./CONTEXT.md) — domain glossary (ubiquitous language)
- [`docs/adr/`](./docs/adr/) — architecture decision records
- [`docs/agents/`](./docs/agents/) — agent skill configuration (issue tracker, triage, domain layout)
- [`AGENTS.md`](./AGENTS.md) — agent skills index

## Planned stack (v1)

See ADRs for full rationale. Short version: Next.js (Vercel) + workers, Supabase Postgres/pgvector/Realtime, Clerk auth, Postgres-backed job queue, hosted LLM via an AI port (NVIDIA NIM in dev → DeepSeek later).
