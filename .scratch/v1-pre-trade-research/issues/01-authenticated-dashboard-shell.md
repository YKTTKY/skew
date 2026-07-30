# 01 — Authenticated Dashboard shell

**What to build:** A Retail Trader can sign up, sign in, and sign out on the web Dashboard. Unauthenticated visitors cannot open Watchlist or Instrument research surfaces. A signed-in Retail Trader sees an empty authenticated home with a clear empty state—not other users’ data. Establishes the modular-monolith app baseline (Next.js + worker shell as needed), Clerk auth, and Supabase JWT/RLS wiring only as far as this behavior requires.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Unauthenticated visitors cannot access Watchlist or Instrument research surfaces
- [x] Retail Trader can sign up / sign in / sign out
- [x] Signed-in Retail Trader sees an authenticated empty home with a clear empty state
- [x] One Retail Trader cannot observe another’s personal surfaces (identity/RLS baseline)
- [x] Automated tests assert auth-gate behavior at the Pre-Trade Research surface (not vendor SDK internals)

## Comments

### Implementation notes (agent)

- Scaffolded Next.js App Router modular monolith + Vitest.
- Application seam: `getWatchlistHome` / `getInstrumentResearch` with fakeable `AuthSession` and `PersonalSurfaceStore`.
- Clerk: middleware protects `/dashboard(*)`; sign-in/sign-up routes + landing CTAs; `UserButton` for sign-out.
- Personal surface isolation uses in-memory store keyed by `retailTraderId` (app-layer multi-tenant baseline). Durable Supabase JWT/RLS for Watchlists is issue 02 (issue 01 only required isolation “as far as this behavior requires”).
- Tests: `src/modules/dashboard/pre-trade-research-surface.test.ts` (5 cases).

### Human verification (2026-07-30)

Verified against the issue 01 smoke checklist with real Clerk keys in `.env.local`: landing sign-up/in, unauthenticated gate on `/dashboard` and Instrument routes, authenticated empty Watchlist home, Instrument empty shell, and sign-out. No issues found — works as expected. **Done.**
