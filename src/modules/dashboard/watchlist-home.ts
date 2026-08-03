import type { AuthSession } from "@/modules/auth/types";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import type {
  BiasScore,
  ResearchSurfaceStore,
  SentimentScore,
} from "@/modules/dashboard/research-surface";
import { RESEARCH_WINDOW_DAYS } from "@/modules/dashboard/research-surface";

export type WatchlistHomeInstrument = {
  ticker: string;
};

/** Story × Instrument scores for Instruments on the Retail Trader’s Watchlist. */
export type WatchlistHomeRelatedInstrument = {
  ticker: string;
  bias: BiasScore;
  sentiment: SentimentScore;
};

/** Home Story card: prioritized coverage for Watchlist scanning before Instrument View. */
export type WatchlistHomeStory = {
  id: string;
  title: string;
  updatedAt: string;
  relatedInstruments: WatchlistHomeRelatedInstrument[];
};

export type WatchlistHomeDeps = {
  personalStore: PersonalSurfaceStore;
  researchStore: ResearchSurfaceStore;
  /** Clock for Research Window filtering (tests inject a fixed instant). */
  asOf?: Date;
  researchWindowDays?: number;
};

export type WatchlistHomeResult =
  | { status: "unauthenticated" }
  | {
      status: "ok";
      empty: boolean;
      instruments: WatchlistHomeInstrument[];
      emptyStateMessage: string;
      /** Stories for Watchlist Instruments, freshest first. */
      stories: WatchlistHomeStory[];
      /** True when the Watchlist has Instruments but no Stories in the Research Window. */
      noCoverage: boolean;
      noCoverageMessage: string;
    };

/** Clear empty-state copy for a signed-in Retail Trader with no Watchlist Instruments. */
export const WATCHLIST_EMPTY_STATE_MESSAGE =
  "Your Watchlist is empty. Add US equities or ETFs to prioritize Pre-Trade Research on your Dashboard.";

/** Clear no-coverage copy when Watchlist has names but little/no news in the Research Window. */
export const WATCHLIST_NO_COVERAGE_MESSAGE =
  "No Stories yet for your Watchlist Instruments within the Research Window. Open an Instrument View for deeper context, or check back as coverage is linked and scored.";

/**
 * Watchlist home for the Pre-Trade Research surface.
 * Unauthenticated callers are denied; authenticated callers see only their own Watchlist.
 * Home prioritizes Stories and scores for Watchlist Instruments over unrelated coverage.
 */
export async function getWatchlistHome(
  session: AuthSession,
  deps: WatchlistHomeDeps,
): Promise<WatchlistHomeResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const tickers = await deps.personalStore.listWatchlistTickers(
    session.retailTraderId,
  );
  const instruments = tickers.map((ticker) => ({ ticker }));
  const empty = instruments.length === 0;

  if (empty) {
    return {
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: WATCHLIST_EMPTY_STATE_MESSAGE,
      stories: [],
      noCoverage: false,
      noCoverageMessage: "",
    };
  }

  const asOf = deps.asOf ?? new Date();
  const windowDays = deps.researchWindowDays ?? RESEARCH_WINDOW_DAYS;
  const watchlistSet = new Set(tickers.map((t) => t.toUpperCase()));

  const byStoryId = new Map<string, WatchlistHomeStory>();

  for (const ticker of tickers) {
    const instrumentStories = await deps.researchStore.listStoriesForInstrument({
      ticker,
      asOf,
      windowDays,
    });

    for (const story of instrumentStories) {
      const related: WatchlistHomeRelatedInstrument = {
        ticker: ticker.toUpperCase(),
        bias: story.bias,
        sentiment: story.sentiment,
      };

      const existing = byStoryId.get(story.id);
      if (existing) {
        if (
          !existing.relatedInstruments.some(
            (r) => r.ticker === related.ticker,
          )
        ) {
          existing.relatedInstruments.push(related);
        }
        continue;
      }

      byStoryId.set(story.id, {
        id: story.id,
        title: story.title,
        updatedAt: story.updatedAt,
        relatedInstruments: [related],
      });
    }
  }

  // Defensive: only Instruments on this Watchlist appear as related navigation targets.
  const stories = [...byStoryId.values()].map((story) => ({
    ...story,
    relatedInstruments: story.relatedInstruments.filter((r) =>
      watchlistSet.has(r.ticker),
    ),
  }));

  stories.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  // Stable related-instrument order: Watchlist order.
  for (const story of stories) {
    story.relatedInstruments.sort(
      (a, b) => tickers.indexOf(a.ticker) - tickers.indexOf(b.ticker),
    );
  }

  const noCoverage = stories.length === 0;

  return {
    status: "ok",
    empty: false,
    instruments,
    emptyStateMessage: "",
    stories,
    noCoverage,
    noCoverageMessage: noCoverage ? WATCHLIST_NO_COVERAGE_MESSAGE : "",
  };
}
