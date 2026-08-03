# 08 — Live Dashboard via Realtime

**What to build:** Open Watchlist home and Instrument Views update when new Stories or scores land for relevant Instruments (minutes-class freshness; tests may accelerate). Realtime delivery only includes rows the Retail Trader is allowed to see; payloads stay small enough to be useful. Live updates do not require a full manual refresh for the happy path.

**Blocked by:** 04 — Watchlist home prioritizes Stories; 06 — Thin pipeline: fixture Source → scored Instrument View

**Status:** done

- [x] Open Instrument View reflects newly landed Stories/scores for that Instrument without a full page reload
- [x] Open Watchlist home reflects newly landed prioritized Stories/scores for followed Instruments without a full page reload
- [x] A Retail Trader does not receive another user’s Watchlist-personal updates
- [x] Realtime payloads remain usefully small (no shipping entire unrelated tables to the client)
- [x] Automated tests assert live update behavior as far as the stack allows (accelerate jobs; fake AI OK)

## Comments

### Implementation notes (agent)

- Research live bus: small invalidations `{ storyId, tickers, updatedAt }` after pipeline publish via `NotifyingPipelineResearchWriter`.
- Scope filtering: Instrument View (one ticker); Watchlist home tickers always resolved server-side from `PersonalSurfaceStore` for the signed-in subject (client cannot supply peer membership). Personal Watchlist membership never rides the research bus.
- Dashboard: auth-gated SSE `/api/dashboard/research-live` + `LiveResearchRefresh` client calls `router.refresh()` on events (no full manual navigation).
- In-memory bus + SSE is the same interim pattern as in-memory research store / job queue (process-local). Production delivery remains Supabase Realtime + RLS (ADR 0006); replace bus adapter and SSE transport when Postgres research lands.
- Primary-seam tests in `pre-trade-research-surface.test.ts` (live Dashboard realtime describe block).
