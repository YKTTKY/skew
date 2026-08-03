/**
 * Durable Pre-Trade Research data for Instrument Views.
 * Primary analysis grain is Article × Instrument; roll up to Story × Instrument.
 * Adapters (seeded in-memory, later Supabase) implement ResearchSurfaceStore.
 */

/** V1 Research Window target — Stories older than this are not current research. */
export const RESEARCH_WINDOW_DAYS = 90;

/** Bias: bullish ↔ bearish market framing for an Instrument pair. */
export type BiasLabel = "bullish" | "bearish" | "neutral";

/** Sentiment: emotional/linguistic tone — independent of Bias. */
export type SentimentLabel = "calm" | "alarmist" | "neutral";

export type BiasScore = {
  label: BiasLabel;
  rationale: string;
};

export type SentimentScore = {
  label: SentimentLabel;
  rationale: string;
};

/** Article as shown on an Instrument View for one Instrument (after syndication dedupe). */
export type InstrumentArticleResearch = {
  id: string;
  title: string;
  /** Source attributions; multiple when syndicated republishes were collapsed. */
  sources: string[];
  /** ISO-8601 publish time for freshness cues. */
  publishedAt: string;
  bias: BiasScore;
  sentiment: SentimentScore;
};

/** Story × Instrument research: rollup plus per-Article breakdown for one Instrument. */
export type InstrumentStoryResearch = {
  id: string;
  title: string;
  /** ISO-8601 last update for freshness cues. */
  updatedAt: string;
  bias: BiasScore;
  sentiment: SentimentScore;
  articles: InstrumentArticleResearch[];
};

/**
 * Read model for Instrument View Stories within the Research Window.
 * Only Articles linked to the requested Instrument are returned.
 */
export type ResearchSurfaceStore = {
  listStoriesForInstrument(input: {
    ticker: string;
    asOf: Date;
    windowDays: number;
  }): Promise<InstrumentStoryResearch[]>;
};
