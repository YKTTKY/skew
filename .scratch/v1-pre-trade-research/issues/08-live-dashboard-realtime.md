# 08 — Live Dashboard via Realtime

**What to build:** Open Watchlist home and Instrument Views update when new Stories or scores land for relevant Instruments (minutes-class freshness; tests may accelerate). Realtime delivery only includes rows the Retail Trader is allowed to see; payloads stay small enough to be useful. Live updates do not require a full manual refresh for the happy path.

**Blocked by:** 04 — Watchlist home prioritizes Stories; 06 — Thin pipeline: fixture Source → scored Instrument View

**Status:** ready-for-agent

- [ ] Open Instrument View reflects newly landed Stories/scores for that Instrument without a full page reload
- [ ] Open Watchlist home reflects newly landed prioritized Stories/scores for followed Instruments without a full page reload
- [ ] A Retail Trader does not receive another user’s Watchlist-personal updates
- [ ] Realtime payloads remain usefully small (no shipping entire unrelated tables to the client)
- [ ] Automated tests assert live update behavior as far as the stack allows (accelerate jobs; fake AI OK)
