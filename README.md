# Skew

Automated, AI-powered news platform for **retail traders** doing **pre-trade research** on US equities and ETFs.

Skew gathers news from a curated set of sources, clusters coverage into **stories**, scores **bias** (bullish ↔ bearish) and **sentiment** (tone) per instrument, and serves results in a near-real-time **dashboard**. It does **not** issue trade recommendations.

## Stack (v1)

- **Web:** Next.js App Router (Vercel)
- **Auth:** Clerk (Retail Trader accounts); Supabase accepts Clerk JWTs for RLS (ADR 0003)
- **Data:** Supabase Postgres + pgvector (ADR 0002)
- **Workers:** separate entrypoints in this repo (ADR 0001)

## Local development

```bash
cp .env.example .env.local
# Fill in Clerk keys from https://dashboard.clerk.com

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up / sign in via Clerk, then open the **Dashboard** (`/dashboard`). Unauthenticated visitors are blocked from Watchlist and Instrument research routes.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm test` | Vitest (Pre-Trade Research surface tests) |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Docs

- [`CONTEXT.md`](./CONTEXT.md) — domain glossary (ubiquitous language)
- [`docs/adr/`](./docs/adr/) — architecture decision records
- [`docs/agents/`](./docs/agents/) — agent skill configuration
- [`AGENTS.md`](./AGENTS.md) — agent skills index
- [`.scratch/v1-pre-trade-research/`](./.scratch/v1-pre-trade-research/) — v1 spec and implementation tickets
