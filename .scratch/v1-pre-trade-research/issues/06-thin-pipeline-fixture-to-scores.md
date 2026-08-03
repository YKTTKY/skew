# 06 — Thin pipeline: fixture Source → scored Instrument View

**What to build:** An async worker path on a Postgres-backed job queue runs ingest → embed → link (explicit tickers/cashtags/metadata) → minimal cluster → score through an internal AI port, without blocking Dashboard HTTP. Fixture or curated Source input yields durable Articles (near-identical syndication collapsed to one Article with multiple Source attributions where applicable), Article × Instrument Bias/Sentiment + Rationales, Story × Instrument rollups, and those results appear on the Instrument View without manual seed. AI port is fakeable in tests; development adapter targets NVIDIA NIM. Unlinked Articles still never appear on trader-facing surfaces. Prompts/Rationales stay coverage-only (no trade recommendations).

**Blocked by:** 03 — Instrument View from seeded research data

**Status:** ready-for-human

- [x] Pipeline work runs async (jobs/workers), not on the Dashboard request path
- [x] Fixture/curated Source ingest produces durable Articles visible after linking/scoring
- [x] Syndication near-duplicates collapse to one Article with multiple Sources when applicable
- [x] Explicit ticker/cashtag/metadata linking attaches Articles to Instruments
- [x] Article × Instrument scores and Rationales land via the AI port (fake in tests)
- [x] Story × Instrument rollups appear on the Instrument View without manual seed
- [x] Unlinked Articles never appear on trader-facing surfaces
- [x] Rationales/prompts under test produce no buy/sell/hold or soft “should act” language
- [x] Automated tests assert trader-visible outcomes after the job path runs (not queue internals)
