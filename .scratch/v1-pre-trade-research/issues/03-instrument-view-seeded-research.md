# 03 — Instrument View from seeded research data

**What to build:** Opening an Instrument View shows Pre-Trade Research for that Instrument from durable data (seeded is fine—no live pipeline required). Within the ~90-day Research Window: Stories with Story × Instrument Bias/Sentiment rollups, per-Article Bias/Sentiment breakdown (independent of each other), short Rationales, Source attributions after syndication dedupe, publish/freshness cues, and support for different scores per Instrument on the same Story. Unlinked Articles never appear. Empty and error states (unknown ticker, load failure, no Stories) are clear. UI copy is coverage-only—no buy, sell, hold, or soft “should act” language. Ad-hoc research by ticker works without requiring Watchlist membership.

**Blocked by:** 01 — Authenticated Dashboard shell

**Status:** ready-for-human

- [x] Authenticated Retail Trader can open an Instrument View for a known Instrument by ticker
- [x] Stories outside the Research Window (~90 days) do not appear as current research
- [x] Story × Instrument rollups and Article × Instrument breakdowns are both visible
- [x] Bias and Sentiment are independent; Rationales are shown for scores
- [x] Deduped Articles can show multiple Source attributions
- [x] Multi-Instrument Stories can show different scores per Instrument
- [x] Unlinked Articles never appear on the Instrument View
- [x] Empty and error states are clear and recoverable
- [x] UI copy contains no trade recommendations or soft advice
- [x] Automated tests assert Instrument View behavior at the primary seam (seeded data OK)

## Comments

### Implementation notes (agent)

- Extended Pre-Trade Research surface: `getInstrumentResearch` now takes catalog + `ResearchSurfaceStore`, returns Stories in the ~90-day Research Window or clear `unknown_instrument` / `error` / empty states.
- New port `ResearchSurfaceStore` (`research-surface.ts`); in-memory adapter + relative seed corpus (AAPL product Story, multi-Instrument M&A Story, stale Story, unlinked noise).
- Production composition root seeds timestamps from wall clock so the demo Research Window stays populated; tests pin `asOf` + `buildSeedResearchStories(asOf)`.
- Instrument View UI: Story cards with Bias/Sentiment rollups, Article breakdowns, multi-Source attributions, freshness cues; unknown / error / empty recovery paths; coverage-only copy.
- Tests: `pre-trade-research-surface.test.ts` (21 cases) — Instrument View seeded research + recommendation-language guard at the primary seam.
