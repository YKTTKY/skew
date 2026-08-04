# 04 — Watchlist home prioritizes Stories

**What to build:** Watchlist home prioritizes Stories and scores for Instruments on the Retail Trader’s Watchlist so they can scan narrative before opening an Instrument View. Navigation between home and Instrument View works as one Pre-Trade Research flow.

**Blocked by:** 02 — Watchlist management; 03 — Instrument View from seeded research data

**Status:** done

- [x] Home prioritizes Stories/scores for Watchlist Instruments over unrelated coverage
- [x] Retail Trader can navigate from a home Story/Instrument into the Instrument View and back
- [x] Empty or no-coverage states on home remain clear when the Watchlist has names but little news
- [x] Automated tests assert home prioritization behavior at the primary seam

## Comments

### Implementation notes (agent)

- Extended `getWatchlistHome` with `WatchlistHomeDeps` (personal + research stores): returns prioritized Stories/scores only for Watchlist Instruments (freshest first), multi-Instrument Stories only expose related scores for Instruments on the list.
- Distinct empty (no Instruments) vs no-coverage (Instruments but no Stories in Research Window) messages.
- Dashboard home UI: Story cards with Bias/Sentiment per related Watchlist Instrument and links into Instrument View; existing Instrument View “← Watchlist” closes the loop.
- Tests: `pre-trade-research-surface.test.ts` (27 cases) — home prioritization, exclusion of unrelated coverage, no-coverage state, navigation targets, recommendation-language guard at the primary seam.

### Code review (agent)

- **Standards:** no hard violations. Judgment: duplicated `scoreTone`/`formatFreshness` with Instrument View page; optional defensive related-instrument filter.
- **Spec:** requirements covered at app seam + UI links. Navigate “back” relies on Instrument View from ticket 03. Freshest-first sort and freshness display are additive polish.
