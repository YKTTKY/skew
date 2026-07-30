# 03 — Instrument View from seeded research data

**What to build:** Opening an Instrument View shows Pre-Trade Research for that Instrument from durable data (seeded is fine—no live pipeline required). Within the ~90-day Research Window: Stories with Story × Instrument Bias/Sentiment rollups, per-Article Bias/Sentiment breakdown (independent of each other), short Rationales, Source attributions after syndication dedupe, publish/freshness cues, and support for different scores per Instrument on the same Story. Unlinked Articles never appear. Empty and error states (unknown ticker, load failure, no Stories) are clear. UI copy is coverage-only—no buy, sell, hold, or soft “should act” language. Ad-hoc research by ticker works without requiring Watchlist membership.

**Blocked by:** 01 — Authenticated Dashboard shell

**Status:** ready-for-agent

- [ ] Authenticated Retail Trader can open an Instrument View for a known Instrument by ticker
- [ ] Stories outside the Research Window (~90 days) do not appear as current research
- [ ] Story × Instrument rollups and Article × Instrument breakdowns are both visible
- [ ] Bias and Sentiment are independent; Rationales are shown for scores
- [ ] Deduped Articles can show multiple Source attributions
- [ ] Multi-Instrument Stories can show different scores per Instrument
- [ ] Unlinked Articles never appear on the Instrument View
- [ ] Empty and error states are clear and recoverable
- [ ] UI copy contains no trade recommendations or soft advice
- [ ] Automated tests assert Instrument View behavior at the primary seam (seeded data OK)
