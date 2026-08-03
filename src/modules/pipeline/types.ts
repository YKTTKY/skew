/**
 * Domain types for the thin news analysis pipeline
 * (ingest → embed → link → cluster → score).
 */

import type { ArticleInstrumentScore } from "@/modules/pipeline/ai-port";

/** One item from a curated Source feed (RSS/API fixture shape). */
export type SourceFeedItem = {
  sourceName: string;
  title: string;
  body: string;
  /** ISO-8601 publish time. */
  publishedAt: string;
  /** Optional stable identity for syndication matching. */
  externalId?: string;
  /** Explicit metadata tickers when the Source provides them. */
  metadataTickers?: string[];
};

/** Durable Article after syndication dedupe (may carry multiple Sources). */
export type PipelineArticle = {
  id: string;
  title: string;
  body: string;
  sources: string[];
  publishedAt: string;
  externalId?: string;
  metadataTickers: string[];
  embedding?: number[];
  /** Linked Instruments after explicit, NLP entity, and macro linking. */
  instrumentLinks: string[];
  /** Article × Instrument scores after the score stage. */
  scoresByTicker: Record<string, ArticleInstrumentScore>;
};

export type PipelineStory = {
  id: string;
  title: string;
  updatedAt: string;
  articleIds: string[];
  /** Story × Instrument rollups after scoring. */
  rollupByTicker: Record<string, ArticleInstrumentScore>;
};

/** Mutable working set shared across pipeline job stages. */
export type PipelineBatch = {
  batchId: string;
  feedItems: SourceFeedItem[];
  articles: PipelineArticle[];
  stories: PipelineStory[];
};
