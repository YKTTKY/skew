/**
 * Live Dashboard updates when Stories or scores land for Instruments.
 *
 * Realtime payloads stay small: invalidation hints (story id + tickers + time),
 * not full Story/score tables. Clients re-read via getInstrumentResearch /
 * getWatchlistHome after a matching event.
 *
 * Personal Watchlist membership never rides this bus — only shared research
 * invalidations. Scope filtering keeps open views relevant without shipping
 * unrelated tables (ADR 0006).
 */

import type { ResearchWriteStory } from "@/modules/pipeline/research-writer";

/** Small research invalidation — enough to know what to re-fetch. */
export type ResearchLiveEvent = {
  storyId: string;
  /** Instruments this Story now touches (client/server filter). */
  tickers: string[];
  /** ISO-8601 Story update time. */
  updatedAt: string;
};

/**
 * What an open Dashboard surface cares about.
 * - instrument: Instrument View for one ticker
 * - watchlist: Watchlist home for the Retail Trader’s followed tickers
 *   (tickers should come from PersonalSurfaceStore for that subject — never
 *   from another Retail Trader’s membership list)
 */
export type ResearchLiveScope =
  | { kind: "instrument"; ticker: string }
  | { kind: "watchlist"; tickers: string[] };

export type ResearchLiveSubscription = {
  unsubscribe(): void;
};

/**
 * Process-local / adapter seam for research live delivery.
 * Supabase Realtime is the production intent (ADR 0006); in-memory for tests
 * and single-process demos.
 */
export type ResearchLiveBus = {
  publish(events: ResearchLiveEvent[]): Promise<void>;
  /**
   * Deliver only events that intersect the given scope.
   * Does not authenticate — callers gate with AuthSession at the app edge.
   */
  subscribe(
    scope: ResearchLiveScope,
    onEvent: (event: ResearchLiveEvent) => void,
  ): ResearchLiveSubscription;
};

/** Normalize scope tickers for matching. */
export function normalizeLiveScope(scope: ResearchLiveScope): ResearchLiveScope {
  if (scope.kind === "instrument") {
    return {
      kind: "instrument",
      ticker: scope.ticker.trim().toUpperCase(),
    };
  }
  return {
    kind: "watchlist",
    tickers: [
      ...new Set(
        scope.tickers
          .map((t) => t.trim().toUpperCase())
          .filter((t) => t.length > 0),
      ),
    ],
  };
}

/** True when the event affects Instruments in the open surface’s scope. */
export function eventMatchesScope(
  event: ResearchLiveEvent,
  scope: ResearchLiveScope,
): boolean {
  const normalized = normalizeLiveScope(scope);
  const eventTickers = new Set(
    event.tickers.map((t) => t.trim().toUpperCase()).filter(Boolean),
  );

  if (normalized.kind === "instrument") {
    return eventTickers.has(normalized.ticker);
  }

  return normalized.tickers.some((t) => eventTickers.has(t));
}

/**
 * Build small live events from pipeline-published Stories.
 * Tickers come from rollups (Story × Instrument), not full Article bodies.
 */
export function eventsFromPublishedStories(
  stories: ResearchWriteStory[],
): ResearchLiveEvent[] {
  return stories.map((story) => ({
    storyId: story.id,
    tickers: Object.keys(story.rollupByTicker).map((t) => t.toUpperCase()),
    updatedAt: story.updatedAt,
  }));
}

/**
 * Guardrail for payload discipline: events must not embed full research rows.
 * Used in tests and as documentation of the contract.
 */
export function isUsefullySmallLiveEvent(event: ResearchLiveEvent): boolean {
  if (typeof event.storyId !== "string" || event.storyId.length === 0) {
    return false;
  }
  if (!Array.isArray(event.tickers) || event.tickers.length === 0) {
    return false;
  }
  if (typeof event.updatedAt !== "string" || event.updatedAt.length === 0) {
    return false;
  }

  const keys = Object.keys(event).sort();
  if (keys.join(",") !== "storyId,tickers,updatedAt") {
    return false;
  }

  // Reject accidentally large embedded blobs (e.g. serialized articles).
  const serialized = JSON.stringify(event);
  return serialized.length <= 2_048;
}
