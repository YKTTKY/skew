# 07 — Instrument linking rules and multi-article Story clustering

**What to build:** Extend the pipeline beyond the thin happy path so linking and clustering match product rules. NLP entity linking attaches relevant Articles when explicit markers are missing. Broad market pieces attach only to major index ETFs when clearly about the market as a whole (or when they explicitly name Instruments)—not every equity in a sector. Related Articles cluster into the same Story (embeddings used primarily for clustering). On the Instrument View, multi-Article Stories let the Retail Trader compare framing across outlets; rollups stay consistent with underlying Article × Instrument scores. Unlinked Articles still never appear on trader-facing surfaces.

**Blocked by:** 06 — Thin pipeline: fixture Source → scored Instrument View

**Status:** ready-for-agent

- [ ] NLP entity linking attaches Articles that lack explicit tickers/cashtags when entities resolve to Instruments
- [ ] Market-wide Articles may link to major index ETFs when clearly about the market as a whole; they do not auto-link every sector equity
- [ ] Explicitly named Instruments on macro pieces still link correctly
- [ ] Related Articles cluster into a shared Story visible on related Instrument Views
- [ ] Multi-Article Stories show per-Article score breakdown and consistent Story × Instrument rollups
- [ ] Unlinked Articles remain absent from Dashboard, Watchlist home, and Instrument View
- [ ] Automated tests assert linking and clustering outcomes at the primary seam (fake AI/embeddings OK)
