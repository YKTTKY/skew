# V1 Pre-Trade Research

Status: ready-for-agent

## Problem Statement

Retail Traders need to understand recent news narrative, Bias, and Sentiment around US equities and ETFs before entering a trade. Today that work is fragmented across many outlets, hard to compare, and easy to misread as a signal to buy or sell. They lack a single near-real-time Dashboard that gathers curated coverage, clusters it into Stories, scores framing per Instrument, and keeps a clear boundary: insight for Pre-Trade Research, never trade recommendations.

## Solution

Skew is an automated, AI-powered news platform for Pre-Trade Research. It ingests news from a curated set of Sources, dedupes syndication into Articles, links Articles to Instruments, clusters related coverage into Stories, scores Bias and Sentiment at Article × Instrument grain (with rollups to Story × Instrument and short Rationales), and surfaces results on a web Dashboard: Watchlist home and Instrument Views, with lightweight Price Context and a ~90-day Research Window. Skew does not issue buy, sell, hold, or soft “should act” recommendations.

## User Stories

1. As a Retail Trader, I want a web Dashboard I can open in a browser, so that I can do Pre-Trade Research without installing a native app.
2. As a Retail Trader, I want to create an account and sign in, so that my Watchlist and preferences are private to me.
3. As a Retail Trader, I want to sign out, so that others using the same device cannot access my Watchlist.
4. As a visitor who is not signed in, I want to be blocked from Watchlist and Instrument research data, so that personal and product data stay protected.
5. As a Retail Trader, I want to search or pick US equity and ETF Instruments by ticker, so that I can follow names I care about.
6. As a Retail Trader, I want to add Instruments to my Watchlist, so that the Dashboard prioritizes coverage for my set.
7. As a Retail Trader, I want to remove Instruments from my Watchlist, so that I stop seeing noise for names I no longer trade around.
8. As a Retail Trader, I want my Watchlist home to prioritize Stories and scores for Instruments I follow, so that I can scan what matters before I dig in.
9. As a Retail Trader, I want to open an Instrument View for any Instrument I research, so that I can focus Pre-Trade Research on one name.
10. As a Retail Trader, I want the Instrument View to show Stories related to that Instrument within the Research Window, so that I see recent narrative rather than unbounded history.
11. As a Retail Trader, I want Stories retained for about 90 days on an Instrument View, so that I have enough context for Pre-Trade Research without an unbounded archive.
12. As a Retail Trader, I want each Story to group Articles about the same event or topic, so that I can compare how outlets frame the same coverage.
13. As a Retail Trader, I want to see which Sources contributed to an Article after syndication dedupe, so that I understand outlet reach without double-counting the same piece.
14. As a Retail Trader, I want Bias shown on a bullish ↔ bearish axis for an Instrument on a Story, so that I can see market framing relevant to that name.
15. As a Retail Trader, I want Sentiment shown as emotional or linguistic tone for an Instrument on a Story, so that I can separate tone from bullish/bearish framing.
16. As a Retail Trader, I want Bias and Sentiment that are independent of each other, so that calm bullish or alarmist neutral coverage is still readable correctly.
17. As a Retail Trader, I want rollup Bias and Sentiment at Story × Instrument, so that I can compare framing across a clustered event for one name.
18. As a Retail Trader, I want per-Article Bias and Sentiment for that Instrument, so that I can see disagreement across Sources inside a Story.
19. As a Retail Trader, I want a short Rationale for Bias and Sentiment scores, so that I can trust or dismiss the AI score without a methodology dump.
20. As a Retail Trader, I want different Instruments on the same Story to be able to have different Bias and Sentiment, so that multi-name events (e.g. M&A) do not force a single score.
21. As a Retail Trader, I want only Articles linked to at least one Instrument to appear on trader-facing surfaces, so that unlinked noise never pollutes Pre-Trade Research.
22. As a Retail Trader, I want Articles linked via explicit tickers, cashtags, or metadata, so that obvious instrument mentions are reliable.
23. As a Retail Trader, I want Articles also linked via NLP entity linking when explicit markers are missing, so that relevant coverage is not dropped.
24. As a Retail Trader, I want broad market Articles to attach only to major index ETFs when they are clearly about the market as a whole (or explicitly name Instruments), so that macro context is available without flooding every sector name.
25. As a Retail Trader, I do not want sector-wide auto-linking of every equity in a sector, so that my Watchlist stays free of false relevance.
26. As a Retail Trader, I want near-real-time updates (minutes-class) when new Stories or scores land for Instruments I care about, so that open Dashboard views stay current for Pre-Trade Research.
27. As a Retail Trader, I want lightweight last price and a simple chart on the Instrument View, so that I have Price Context while reading coverage—not a full charting workstation.
28. As a Retail Trader, I never want buy, sell, hold, or soft “you should act” recommendations from Skew, so that I remain the decision-maker and the product stays coverage-only.
29. As a Retail Trader, I want UI copy and score presentation that avoid advice language, so that Pre-Trade Research does not drift into alpha or recommendations.
30. As a Retail Trader, I want to see when coverage was published or last updated in a way that supports Pre-Trade Research, so that I know how fresh the narrative is.
31. As a Retail Trader, I want empty states when my Watchlist has no Instruments or an Instrument has no linked Stories yet, so that I understand what to do next rather than seeing a broken page.
32. As a Retail Trader, I want errors (auth, load failure, missing Instrument) communicated clearly, so that I can recover without guessing.
33. As a system operator, I want news ingested from a curated v1 Source set via RSS and/or API, so that coverage quality stays controlled.
34. As a system operator, I want near-identical syndicated republishes collapsed into one Article with multiple Source attributions, so that scores and Story clusters are not inflated.
35. As a system operator, I want Article embeddings used primarily to cluster Stories automatically, so that related coverage groups without a separate search product in v1.
36. As a system operator, I want the gather → embed → link → cluster → score path to run as async background jobs, so that long-running AI work does not block Dashboard HTTP requests.
37. As a system operator, I want durable domain data (Articles, Stories, Instruments, scores, Watchlists) in Postgres, so that relational many-to-many links stay first-class.
38. As a system operator, I want Bias, Sentiment, Rationales, and embeddings behind an internal AI port, so that development can use NVIDIA NIM and later move to DeepSeek without rewriting pipeline modules.
39. As a system operator, I want Retail Trader accounts via Clerk with Supabase RLS enforcing access by authenticated subject, so that Watchlist and personal data are multi-tenant safe.
40. As a system operator, I want worker paths that use elevated credentials to be carefully bounded, so that pipeline writes cannot leak other users’ data through Realtime or queries.
41. As a Retail Trader, I want Instrument Views and Watchlist home to only receive Realtime updates for rows I am allowed to see, so that live updates do not violate privacy.
42. As a Retail Trader, I want Story × Instrument rollups to remain consistent with underlying Article × Instrument scores, so that drilling from rollup to breakdown matches what I saw at the top.
43. As a Retail Trader, I want to navigate from Watchlist home into an Instrument View and back, so that scanning and deep research form one flow.
44. As a Retail Trader, I want Instruments identified by ticker symbol in the UI, so that names match how I already think about US equities and ETFs.
45. As a product owner, I want the v1 stack to run as a modular monolith (Next.js web + separate worker entrypoints in one TypeScript codebase), so that the vertical slice stays simple while background work deploys separately.
46. As a product owner, I want a Postgres-backed job queue for the pipeline, so that v1 avoids an extra Redis dependency while still meeting minutes-class freshness.
47. As a product owner, I want free-tier-friendly starting infrastructure (e.g. Supabase free tier constraints accepted), so that early development cost stays low with a known limit on retention breadth.
48. As a Retail Trader, I want scores and Stories for Instruments not on my Watchlist to still be viewable if I open that Instrument View (subject to product rules), so that ad-hoc Pre-Trade Research is possible without adding every name permanently—unless a later decision restricts this; v1 allows researching any known Instrument while Watchlist only prioritizes home.
49. As a Retail Trader, I want inaccessible or unknown tickers handled safely, so that I am not shown partial other users’ data or internal errors.
50. As a compliance-minded product owner, I want prompts and UI reviewed against the no-recommendation boundary, so that AI Rationales never prescribe trades.

## Implementation Decisions

### Architecture and deploy shape

- V1 is a modular monolith: one TypeScript codebase with Next.js App Router for the Dashboard/API, and separate worker entrypoints for long-running pipeline work.
- Web deploys to Vercel; workers deploy to a Railway/Fly/Render-class host (or equivalent) separate from the web process.
- Near-real-time means minutes-class freshness, not sub-second trading latency.

### Data and auth

- Supabase Postgres is the system of record for Articles, Stories, Instruments, Article × Instrument scores, Story × Instrument rollups, Sources, Watchlists, and embeddings (pgvector).
- pgvector supports automatic Story clustering by similarity; v1 does not ship a separate semantic search product.
- Clerk authenticates Retail Traders; Supabase accepts Clerk JWTs so RLS can enforce per-subject access to Watchlists and personal data.
- Worker writes use carefully reviewed service-role (or equivalent) paths; trader-facing reads go through JWT + RLS.
- Research Window target is about 90 days of Stories on Instrument Views; free-tier storage is an accepted constraint on breadth until upgrade.

### Domain model and scoring

- Glossary terms from the project domain language are authoritative: Retail Trader, Dashboard, Pre-Trade Research, Instrument, Instrument View, Article, Story, Bias, Sentiment, Source, Watchlist, Research Window, Price Context, Rationale.
- Primary analysis grain is Article × Instrument; roll up to Story × Instrument for Instrument View comparison.
- Bias is bullish ↔ bearish framing for that pair; Sentiment is tone; they are independent.
- Each score path that Retail Traders see includes a short Rationale.
- Articles may have multiple Sources after syndication dedupe.
- Articles with no Instrument link never appear on Dashboard, Watchlist home, or Instrument View.
- Instrument linking: explicit tickers/cashtags/metadata plus NLP entity linking.
- Macro / market-wide pieces link to major index ETFs (e.g. SPY, QQQ) only when clearly about the market as a whole or when they explicitly name Instruments—not every name in a sector.

### Pipeline and AI

- Pipeline stages run as async jobs on a Postgres-backed queue (e.g. pg-boss or equivalent queue tables on the same Postgres): ingest → embed → link → cluster → score (and rollup as needed).
- Bias, Sentiment, Rationales, and embeddings go through an internal AI port (interface), not scattered vendor SDKs.
- Development targets NVIDIA NIM API; production path is expected to move to DeepSeek (flash, then pro) without rewriting pipeline modules.
- Prompts, score schemas, and embedding dimensions stay portable; dimension changes require a re-embed migration strategy.

### Dashboard and live updates

- V1 is web-only.
- Watchlist home prioritizes Stories and scores for the Retail Trader’s Watchlist Instruments.
- Instrument View is the primary deep-research surface: Stories, rollup and per-Article scores, Rationales, Price Context.
- Open Watchlist home and Instrument Views subscribe via Supabase Realtime when new Stories or scores land for relevant Instruments; schema and RLS must allow clients to subscribe only to permitted rows; Realtime payloads stay small and useful.
- Price Context is last price + simple chart for orientation only—not full technical analysis or a trading terminal.

### Product boundary

- Skew never issues buy, sell, hold, or equivalent recommendations, including soft “should act” signals.
- UI copy and AI prompts must be written and tested against this boundary.

### Module shape (logical)

- Prefer deep modules with small interfaces. Under the single product seam (Retail Trader Pre-Trade Research surface), logical modules include at least:
  - Dashboard/application layer (auth-gated Watchlist home, Instrument View, Watchlist mutations).
  - News analysis pipeline (ingest through score/rollup), invoked by workers via the job queue.
  - AI port (fakeable in tests; NIM adapter in development).
  - Price Context provider (lightweight market data adapter).
  - Persistence via Supabase Postgres with RLS policies co-designed with Realtime.

### Seams

- Single primary test and product seam: **Retail Trader Pre-Trade Research surface** (observable Dashboard behavior and durable outcomes a Retail Trader relies on).
- Pipeline, queue, AI port, and price feed are adapters under that seam, not separate product APIs.

## Testing Decisions

### What makes a good test

- Assert **external behavior** at the primary seam: what a signed-in Retail Trader can see and do, and what must never appear (unlinked Articles, other users’ Watchlists, trade recommendations).
- Do not assert implementation details: table shapes beyond required outcomes, job library internals, specific React component trees, vendor SDK call shapes, or private helper structure.
- Prefer the highest seam: drive HTTP/UI or application-level APIs that the Dashboard uses, with fakes for AI and external feeds.
- When the pipeline is under test, still assert **trader-visible or durable domain outcomes** (e.g. after jobs run with a fake AI port, Instrument View data includes expected Story scores)—not queue row formats.

### What will be tested

- Auth gate: unauthenticated access denied to Watchlist and Instrument research data; authenticated Retail Trader sees only their Watchlist data for personal surfaces.
- Watchlist add/remove and home prioritization behavior.
- Instrument View: Stories within Research Window; Story × Instrument rollups; Article × Instrument breakdown; Rationales; Source attributions on deduped Articles.
- Linking rules: unlinked Articles absent from trader-facing surfaces; multi-Instrument Stories can carry different scores per Instrument.
- Product boundary: no recommendation language in UI strings and in Rationales produced under test prompts/fakes.
- Pipeline happy path with fake AI port: ingest/link/cluster/score yields Dashboard-visible scores in minutes-class job processing (can be accelerated in tests).
- RLS/Realtime safety at the behavior level: one user cannot read another’s Watchlist; subscriptions only deliver permitted data (as far as automated tests can exercise).

### Prior art

- Greenfield: no existing test suite. Establish the first suite around the primary seam with a fake AI port and test doubles for RSS/price as needed.
- Prefer a small number of high-level tests over many low-level unit tests until modules stabilize.

## Out of Scope

- Native mobile apps.
- Trade execution, brokerage, portfolio/holdings tracking, or position management.
- Buy/sell/hold recommendations, alpha signals, or price-move prediction as a product feature.
- Political left/right media-bias product (Bias here is market framing only).
- Full charting workstation / technical analysis terminal.
- Unbounded news archive beyond the Research Window target.
- Separate semantic search product or general web search.
- Microservices split or multi-region active-active for v1.
- Redis/BullMQ as the v1 job backbone.
- Fully local LLM inference as the v1 default path.
- Hard-coded single AI vendor SDK usage outside the AI port.
- Linking every equity in a sector for macro/sector pieces.
- Showing unlinked Articles on trader-facing surfaces.
- Multi-asset classes beyond US equities and ETFs (options, crypto, futures, international) in v1.
- Social features, sharing Watchlists, or collaborative research.
- Billing, paid tiers, and usage metering (may come later; not required for this spec’s vertical behavior).
- Admin CMS for Sources beyond whatever minimum is needed to run a curated v1 set (can be config/seed).
- Guaranteeing sub-minute or tick-level market data.

## Further Notes

- Domain glossary: `CONTEXT.md`. Architecture decisions: `docs/adr/` (0001–0009). This spec must not contradict those ADRs; if implementation discovers a conflict, resolve via a new or amended ADR before shipping the change.
- Issue tracker: local markdown under `.scratch/`. Implementation work should be split later via `/to-tickets` into tracer-bullet tickets with blocking edges; do not treat this spec file as a single implementable ticket.
- First implementation should still aim for demoable vertical slices (auth → Watchlist → Instrument View with real or seeded scored Stories → thin pipeline), not horizontal “schema only” milestones that cannot be verified at the primary seam.
- Free-tier Supabase size is an accepted risk; prefer retention and payload discipline over early feature sprawl.
- When in doubt on copy or model output, fail closed toward “coverage only, no advice.”
