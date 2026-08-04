# 05 — Price Context on Instrument View

**What to build:** The Instrument View shows lightweight Price Context—last price and a simple orientation chart—so the Retail Trader can orient while reading coverage. This is not a full charting or technical-analysis workstation. Missing quotes or provider failures degrade gracefully without blocking coverage. Tests use a fake price provider.

**Blocked by:** 03 — Instrument View from seeded research data

**Status:** done

- [x] Instrument View shows last price suitable for orientation
- [x] Instrument View shows a simple chart (not a TA terminal)
- [x] Price failures do not block Stories, scores, or Rationales
- [x] Automated tests use a fake price provider and assert trader-visible Price Context behavior

## Comments

### Implementation notes (agent)

- New port `PriceContextProvider` (`price-context.ts`) with `InstrumentPriceContext` available/unavailable union.
- Fake adapter + failing adapter + seed quotes (`infrastructure/price/`); composition root seeds demo quotes from wall clock.
- `getInstrumentResearch` requires `priceProvider`; loads Stories first, then Price Context with try/catch so provider throws never return `error` for coverage.
- Instrument View UI: last price + SVG orientation polyline; dashed unavailable state that still shows Stories below.
- Tests: `pre-trade-research-surface.test.ts` Price Context block (5 cases) at primary seam with fake provider.
