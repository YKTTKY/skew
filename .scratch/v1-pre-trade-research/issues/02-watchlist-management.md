# 02 — Watchlist management

**What to build:** A signed-in Retail Trader can find US equity/ETF Instruments by ticker, add them to their Watchlist, remove them, and see the current set on home. Another Retail Trader cannot read or mutate that Watchlist. An empty Watchlist shows a clear empty state.

**Blocked by:** 01 — Authenticated Dashboard shell

**Status:** ready-for-agent

- [ ] Retail Trader can search or pick Instruments by ticker (US equities and ETFs)
- [ ] Retail Trader can add and remove Instruments on their Watchlist
- [ ] Home shows the current Watchlist set
- [ ] Empty Watchlist has a clear empty state
- [ ] Another Retail Trader cannot read or mutate this Watchlist (RLS/behavior-level)
- [ ] Automated tests cover Watchlist mutations and isolation at the primary seam
