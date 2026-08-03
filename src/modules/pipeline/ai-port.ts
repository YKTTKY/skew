/**
 * Internal AI port for embeddings, Bias, Sentiment, and Rationales.
 * Pipeline modules depend on this interface — not vendor SDKs (ADR 0004).
 */

import type {
  BiasLabel,
  SentimentLabel,
} from "@/modules/dashboard/research-surface";

export type ArticleInstrumentScore = {
  bias: BiasLabel;
  biasRationale: string;
  sentiment: SentimentLabel;
  sentimentRationale: string;
};

export type AiPort = {
  /** Dense embedding for Story clustering (and future similarity work). */
  embed(input: { text: string }): Promise<number[]>;

  /**
   * Score Bias and Sentiment for one Article × Instrument pair.
   * Rationales must stay coverage-only (no trade recommendations).
   */
  scoreArticleForInstrument(input: {
    articleTitle: string;
    articleBody: string;
    ticker: string;
  }): Promise<ArticleInstrumentScore>;
};
