# 01 — Authenticated Dashboard shell

**What to build:** A Retail Trader can sign up, sign in, and sign out on the web Dashboard. Unauthenticated visitors cannot open Watchlist or Instrument research surfaces. A signed-in Retail Trader sees an empty authenticated home with a clear empty state—not other users’ data. Establishes the modular-monolith app baseline (Next.js + worker shell as needed), Clerk auth, and Supabase JWT/RLS wiring only as far as this behavior requires.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Unauthenticated visitors cannot access Watchlist or Instrument research surfaces
- [ ] Retail Trader can sign up / sign in / sign out
- [ ] Signed-in Retail Trader sees an authenticated empty home with a clear empty state
- [ ] One Retail Trader cannot observe another’s personal surfaces (identity/RLS baseline)
- [ ] Automated tests assert auth-gate behavior at the Pre-Trade Research surface (not vendor SDK internals)
