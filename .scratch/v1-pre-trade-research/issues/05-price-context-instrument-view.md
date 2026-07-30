# 05 — Price Context on Instrument View

**What to build:** The Instrument View shows lightweight Price Context—last price and a simple orientation chart—so the Retail Trader can orient while reading coverage. This is not a full charting or technical-analysis workstation. Missing quotes or provider failures degrade gracefully without blocking coverage. Tests use a fake price provider.

**Blocked by:** 03 — Instrument View from seeded research data

**Status:** ready-for-agent

- [ ] Instrument View shows last price suitable for orientation
- [ ] Instrument View shows a simple chart (not a TA terminal)
- [ ] Price failures do not block Stories, scores, or Rationales
- [ ] Automated tests use a fake price provider and assert trader-visible Price Context behavior
