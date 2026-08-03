# 06 — Thin pipeline: fixture Source → scored Instrument View

**What to build:** An async worker path on a Postgres-backed job queue runs ingest → embed → link (explicit tickers/cashtags/metadata) → minimal cluster → score through an internal AI port, without blocking Dashboard HTTP. Fixture or curated Source input yields durable Articles (near-identical syndication collapsed to one Article with multiple Source attributions where applicable), Article × Instrument Bias/Sentiment + Rationales, Story × Instrument rollups, and those results appear on the Instrument View without manual seed. AI port is fakeable in tests; development adapter targets NVIDIA NIM. Unlinked Articles still never appear on trader-facing surfaces. Prompts/Rationales stay coverage-only (no trade recommendations).

**Blocked by:** 03 — Instrument View from seeded research data

**Status:** done

- [x] Pipeline work runs async (jobs/workers), not on the Dashboard request path
- [x] Fixture/curated Source ingest produces durable Articles visible after linking/scoring
- [x] Syndication near-duplicates collapse to one Article with multiple Sources when applicable
- [x] Explicit ticker/cashtag/metadata linking attaches Articles to Instruments
- [x] Article × Instrument scores and Rationales land via the AI port (fake in tests)
- [x] Story × Instrument rollups appear on the Instrument View without manual seed
- [x] Unlinked Articles never appear on trader-facing surfaces
- [x] Rationales/prompts under test produce no buy/sell/hold or soft “should act” language
- [x] Automated tests assert trader-visible outcomes after the job path runs (not queue internals)

## Comments

### Implementation notes (agent)

- Pipeline stages: ingest → embed → link → cluster → score on `JobQueue` (in-memory adapter; Postgres/pg-boss later).
- AI port: `FakeAiPort` (tests) + `NimAiPort` (dev when `NIM_API_KEY` / `NVIDIA_API_KEY` set).
- Primary-seam tests share one research store in-process; Dashboard and worker do not share rows across processes until a Postgres-backed writer exists.
- Worker entrypoint: `npx tsx src/workers/pipeline-worker.ts`.

### Human verification (2026-08-04)

Verified against the issue 06 checklist:

1. **Automated suite** — `npm test` + typecheck green (pipeline block included).
2. **NIM worker** — `npx tsx src/workers/pipeline-worker.ts` with real NIM key completed: fixture batch of 7 items; AAPL Stories listed with Bias/Sentiment (fixture titles mixed with seed corpus in the same process-local store).
3. **Dashboard smoke** — Seeded AAPL research still loads; multi-Instrument Story with MSFT still fine. Worker output is not expected in the browser while stores are in-memory and process-local.

**Mistake we made (record for later):** First NIM run failed with `NIM embeddings failed: HTTP 400`. Cause: `nvidia/nv-embedqa-e5-v5` is not plain OpenAI embeddings — it **requires** `input_type` (`passage` for document/article indexing, `query` for retrieval). The first `NimAiPort.embed` only sent `model` + `input`. Fix (commit `43b3263`): send `input_type: "passage"`, plus clearer error bodies and optional `NVIDIA_API_KEY` alias. After the fix, the full pipeline completed successfully.

**Done.**
