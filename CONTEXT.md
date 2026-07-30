# Skew

Automated, AI-powered news platform that gathers web news, analyzes media bias and sentiment, and surfaces results so Retail Traders can do Pre-Trade Research. Skew does not issue buy, sell, or hold recommendations.

## Language

**Retail Trader**:
A non-professional market participant who uses Skew for news-driven market insight.
_Avoid_: User (when you mean this persona), investor (broader than trading), customer (billing/relationship sense)

**Dashboard**:
The near-real-time web surface where a Retail Trader consumes gathered and analyzed news (Watchlist home and Instrument Views). V1 is web-only.
_Avoid_: Feed, portal, console, native app (v1)

**Pre-Trade Research**:
The primary job Skew serves: understanding recent narrative, bias, and sentiment around a subject before entering a trade.
_Avoid_: Alpha signal, price-move explanation, post-trade review (not the primary job)

**Instrument**:
A tradeable US equity or ETF identified by ticker symbol that a Retail Trader researches in Skew. Articles link via explicit tickers/cashtags/metadata and NLP entity linking; unlinked Articles stay off trader-facing surfaces. Broad market Articles may attach to major index ETFs when the piece is clearly about the market as a whole—not to every name in a sector.
_Avoid_: Asset, security (when you mean the tradeable symbol), stock (ETF-exclusive language)

**Instrument View**:
The primary Dashboard entry for Pre-Trade Research: gathered and analyzed coverage for one Instrument.
_Avoid_: Ticker page, stock page, symbol page

**Article**:
A single published news item after syndication dedupe: near-identical republishes collapse to one Article with multiple Source attributions. Only Articles linked to at least one Instrument appear on trader-facing surfaces (Dashboard, Watchlist home, Instrument View).
_Avoid_: Post, piece, item (when you mean a full news publication)

**Story**:
A cluster of Articles about the same event or topic, which may relate to multiple Instruments. Used so Retail Traders can compare framing across outlets. Appears on each related Instrument View.
_Avoid_: Event, topic, thread (when you mean the clustered coverage unit)

**Bias**:
Market framing along a bullish ↔ bearish axis for a specific **Article × Instrument** pair, rolled up to **Story × Instrument** for comparison. Different Instruments on the same Story may have different Bias.
_Avoid_: Political bias, left/right slant, media bias (when you mean politics), a single Story-wide Bias when multiple Instruments are involved

**Sentiment**:
Emotional or linguistic tone (e.g. calm, alarmist, neutral) for a specific **Article × Instrument** pair, rolled up to **Story × Instrument**—independent of Bias.
_Avoid_: Mood, feeling, market sentiment (when you mean Bias)

**Source**:
A curated news outlet Skew ingests via RSS and/or API as part of the v1 gather set. An Article may list multiple Sources when syndication was deduped.
_Avoid_: Publisher, feed, website (when you mean the outlet in the curated list)

**Watchlist**:
The set of Instruments a Retail Trader follows; the Dashboard home prioritizes Stories and scores for this set.
_Avoid_: Portfolio (implies holdings/positions), favorites, subscriptions (to Sources)

**Research Window**:
How far back an Instrument View retains Stories for Pre-Trade Research. V1 target: about 90 days.
_Avoid_: Archive, history (unbounded)

**Price Context**:
Lightweight last-price and simple chart shown on an Instrument View for orientation during Pre-Trade Research—not a full trading or charting workstation.
_Avoid_: Charting, technical analysis, terminal

**Rationale**:
A short AI-generated explanation supporting a Bias or Sentiment score so a Retail Trader can trust or dismiss it.
_Avoid_: Methodology dump, full evidence panel (v1)
