# 02 — Watchlist management

**What to build:** A signed-in Retail Trader can find US equity/ETF Instruments by ticker, add them to their Watchlist, remove them, and see the current set on home. Another Retail Trader cannot read or mutate that Watchlist. An empty Watchlist shows a clear empty state.

**Blocked by:** 01 — Authenticated Dashboard shell

**Status:** ready-for-human

- [x] Retail Trader can search or pick Instruments by ticker (US equities and ETFs)
- [x] Retail Trader can add and remove Instruments on their Watchlist
- [x] Home shows the current Watchlist set
- [x] Empty Watchlist has a clear empty state
- [x] Another Retail Trader cannot read or mutate this Watchlist (RLS/behavior-level)
- [x] Automated tests cover Watchlist mutations and isolation at the primary seam

## Comments

### Implementation notes (agent)

- Extended Pre-Trade Research surface: `searchInstruments`, `addInstrumentToWatchlist`, `removeInstrumentFromWatchlist`.
- `PersonalSurfaceStore` now supports add/remove; in-memory adapter isolates by `retailTraderId` (behavior-level multi-tenant baseline; durable Supabase RLS can replace the adapter without changing app APIs).
- Seeded `InstrumentCatalog` of liquid US equities/ETFs for ticker search; unknown tickers rejected on add.
- Dashboard UI: `WatchlistManager` + server actions for search/add/remove; empty state preserved.
- Tests: `src/modules/dashboard/pre-trade-research-surface.test.ts` (11 cases total, including mutations + isolation).
