/**
 * Write path from the pipeline into durable research used by Instrument Views.
 * Keeps the read-side ResearchSurfaceStore free of pipeline concerns.
 * Score shape matches Article × Instrument grain (ADR 0008).
 */

import type { ArticleInstrumentScore } from "@/modules/pipeline/ai-port";

/** Alias for published score bags — same grain as AI port and seed corpus. */
export type ResearchWriteScore = ArticleInstrumentScore;

export type ResearchWriteArticle = {
  id: string;
  title: string;
  sources: string[];
  publishedAt: string;
  instrumentLinks: string[];
  scoresByTicker: Record<string, ResearchWriteScore>;
};

export type ResearchWriteStory = {
  id: string;
  title: string;
  updatedAt: string;
  articles: ResearchWriteArticle[];
  rollupByTicker: Record<string, ResearchWriteScore>;
};

/**
 * Pipeline publishes completed Stories (with Article × Instrument scores)
 * so trader-facing surfaces can read them without manual seed.
 */
export type PipelineResearchWriter = {
  publishStories(stories: ResearchWriteStory[]): Promise<void>;
};
