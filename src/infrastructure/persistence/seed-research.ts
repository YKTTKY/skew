import type {
  BiasLabel,
  SentimentLabel,
} from "@/modules/dashboard/research-surface";

/**
 * Durable seed shape for Pre-Trade Research (in-memory until Supabase).
 * Scores are stored at Article × Instrument and Story × Instrument grain.
 * Articles with no instrumentLinks are unlinked noise and must never surface.
 */

export type SeedScore = {
  bias: BiasLabel;
  biasRationale: string;
  sentiment: SentimentLabel;
  sentimentRationale: string;
};

export type SeedArticle = {
  id: string;
  title: string;
  sources: string[];
  publishedAt: string;
  /** Empty = unlinked Article (must never appear on trader-facing surfaces). */
  instrumentLinks: string[];
  /** Per-Instrument Article scores (only for linked tickers). */
  scoresByTicker: Record<string, SeedScore>;
};

export type SeedStory = {
  id: string;
  title: string;
  updatedAt: string;
  articles: SeedArticle[];
  /** Story × Instrument rollups keyed by ticker. */
  rollupByTicker: Record<string, SeedScore>;
};

/**
 * Fixed “now” for deterministic primary-seam tests.
 * Production seed uses wall-clock via buildSeedResearchStories().
 */
export const SEED_AS_OF_ISO = "2026-08-03T12:00:00.000Z";

function daysBefore(asOf: Date, days: number): string {
  const d = new Date(asOf.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Seeded research corpus for Instrument View demos and primary-seam tests.
 * Timestamps are relative to `asOf` so the Research Window stays demoable
 * whether tests pin a clock or production uses wall time.
 *
 * Includes: multi-source Article, multi-Instrument Story with divergent scores,
 * in-window and out-of-window Stories, and an unlinked Article that must not surface.
 */
export function buildSeedResearchStories(
  asOf: Date = new Date(SEED_AS_OF_ISO),
): SeedStory[] {
  return [
    {
      id: "story-aapl-product",
      title: "Apple unveils next iPhone generation",
      updatedAt: daysBefore(asOf, 3),
      rollupByTicker: {
        AAPL: {
          bias: "bullish",
          biasRationale:
            "Coverage frames product demand and pricing power as constructive for Apple.",
          sentiment: "calm",
          sentimentRationale:
            "Tone across outlets is measured product reporting rather than alarm.",
        },
      },
      articles: [
        {
          id: "article-aapl-reuters-wsj",
          title: "Apple iPhone launch draws strong pre-order interest",
          sources: ["Reuters", "The Wall Street Journal"],
          publishedAt: daysBefore(asOf, 4),
          instrumentLinks: ["AAPL"],
          scoresByTicker: {
            AAPL: {
              bias: "bullish",
              biasRationale:
                "Emphasizes pre-order strength and upgrade cycle timing for Apple.",
              sentiment: "calm",
              sentimentRationale:
                "Straight news diction with limited emotional intensifiers.",
            },
          },
        },
        {
          id: "article-aapl-bloomberg",
          title: "Suppliers prepare for higher Apple component orders",
          sources: ["Bloomberg"],
          publishedAt: daysBefore(asOf, 5),
          instrumentLinks: ["AAPL"],
          scoresByTicker: {
            AAPL: {
              bias: "bullish",
              biasRationale:
                "Supplier order commentary implies higher unit expectations for Apple.",
              sentiment: "neutral",
              sentimentRationale:
                "Operational supply-chain language without strong emotional framing.",
            },
          },
        },
      ],
    },
    {
      id: "story-ma-aapl-msft",
      title: "Regulatory review of large-cap tech partnership talks",
      updatedAt: daysBefore(asOf, 10),
      rollupByTicker: {
        AAPL: {
          bias: "bearish",
          biasRationale:
            "For Apple, coverage stresses scrutiny risk and possible deal friction.",
          sentiment: "alarmist",
          sentimentRationale:
            "Language around enforcement and delays is elevated for Apple.",
        },
        MSFT: {
          bias: "neutral",
          biasRationale:
            "For Microsoft, pieces treat the talks as procedural with limited franchise impact.",
          sentiment: "calm",
          sentimentRationale:
            "Microsoft-framed passages stay measured and process-oriented.",
        },
      },
      articles: [
        {
          id: "article-ma-ft",
          title: "Antitrust officials examine tech partnership terms",
          sources: ["Financial Times", "Associated Press"],
          publishedAt: daysBefore(asOf, 11),
          instrumentLinks: ["AAPL", "MSFT"],
          scoresByTicker: {
            AAPL: {
              bias: "bearish",
              biasRationale:
                "Highlights open questions about Apple’s exposure under review.",
              sentiment: "alarmist",
              sentimentRationale:
                "Uses urgency-heavy wording when describing Apple-related risk.",
            },
            MSFT: {
              bias: "neutral",
              biasRationale:
                "Microsoft appears as a peer in process coverage without directional call.",
              sentiment: "calm",
              sentimentRationale:
                "Tone stays factual when the piece names Microsoft.",
            },
          },
        },
      ],
    },
    {
      id: "story-aapl-stale",
      title: "Apple quarterly results from last year",
      updatedAt: daysBefore(asOf, 120),
      rollupByTicker: {
        AAPL: {
          bias: "neutral",
          biasRationale:
            "Routine earnings recap without a strong directional frame.",
          sentiment: "calm",
          sentimentRationale: "Standard earnings-day tone.",
        },
      },
      articles: [
        {
          id: "article-aapl-stale",
          title: "Apple reports earnings in prior Research Window",
          sources: ["CNBC"],
          publishedAt: daysBefore(asOf, 121),
          instrumentLinks: ["AAPL"],
          scoresByTicker: {
            AAPL: {
              bias: "neutral",
              biasRationale: "Balanced results coverage.",
              sentiment: "calm",
              sentimentRationale: "Neutral broadcast tone.",
            },
          },
        },
      ],
    },
    {
      id: "story-unlinked-noise",
      title: "Opinion: markets feel uncertain this week",
      updatedAt: daysBefore(asOf, 2),
      rollupByTicker: {},
      articles: [
        {
          id: "article-unlinked",
          title: "Column without any Instrument link",
          sources: ["Generic Wire"],
          publishedAt: daysBefore(asOf, 2),
          instrumentLinks: [],
          scoresByTicker: {},
        },
      ],
    },
  ];
}

/** Deterministic default corpus anchored at SEED_AS_OF_ISO (for tests). */
export const SEED_RESEARCH_STORIES: SeedStory[] = buildSeedResearchStories(
  new Date(SEED_AS_OF_ISO),
);