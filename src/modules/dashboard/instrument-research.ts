import type { AuthSession } from "@/modules/auth/types";
import type { InstrumentCatalog } from "@/modules/dashboard/instrument-catalog";
import type {
  InstrumentPriceContext,
  PriceContextProvider,
} from "@/modules/dashboard/price-context";
import type {
  InstrumentStoryResearch,
  ResearchSurfaceStore,
} from "@/modules/dashboard/research-surface";
import { RESEARCH_WINDOW_DAYS } from "@/modules/dashboard/research-surface";

export type InstrumentResearchResult =
  | { status: "unauthenticated" }
  | {
      status: "unknown_instrument";
      ticker: string;
      message: string;
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "ok";
      ticker: string;
      empty: boolean;
      stories: InstrumentStoryResearch[];
      emptyStateMessage: string;
      /** Price Context for orientation; unavailable never blocks coverage. */
      priceContext: InstrumentPriceContext;
    };

/** Empty Instrument View copy when no Stories fall in the Research Window. */
export const INSTRUMENT_EMPTY_STATE_MESSAGE =
  "No Stories yet for this Instrument within the Research Window.";

/** Unknown ticker — not a known US equity/ETF Instrument. */
export const INSTRUMENT_UNKNOWN_MESSAGE =
  "That ticker is not a known Instrument. Check the symbol or search from Watchlist.";

/** Load failure — recoverable without exposing internals. */
export const INSTRUMENT_LOAD_ERROR_MESSAGE =
  "We could not load Pre-Trade Research for this Instrument. Try again in a moment.";

export type InstrumentResearchDeps = {
  catalog: InstrumentCatalog;
  researchStore: ResearchSurfaceStore;
  /** Lightweight market-data adapter for Price Context (fakeable in tests). */
  priceProvider: PriceContextProvider;
  /** Clock for Research Window filtering (tests inject a fixed instant). */
  asOf?: Date;
  researchWindowDays?: number;
};

/**
 * Instrument View entry for Pre-Trade Research.
 * Auth-gated; works for any known Instrument (Watchlist membership not required).
 * Returns Stories in the Research Window with Story × Instrument rollups,
 * Article × Instrument breakdowns, and lightweight Price Context.
 * Unlinked Articles never appear. Price failures never block coverage.
 */
export async function getInstrumentResearch(
  session: AuthSession,
  ticker: string,
  deps: InstrumentResearchDeps,
): Promise<InstrumentResearchResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const normalized = ticker.trim().toUpperCase();
  const instrument = await deps.catalog.findByTicker(normalized);
  if (!instrument) {
    return {
      status: "unknown_instrument",
      ticker: normalized,
      message: INSTRUMENT_UNKNOWN_MESSAGE,
    };
  }

  const asOf = deps.asOf ?? new Date();
  const windowDays = deps.researchWindowDays ?? RESEARCH_WINDOW_DAYS;

  let stories: InstrumentStoryResearch[];
  try {
    stories = await deps.researchStore.listStoriesForInstrument({
      ticker: instrument.ticker,
      asOf,
      windowDays,
    });
  } catch {
    return {
      status: "error",
      message: INSTRUMENT_LOAD_ERROR_MESSAGE,
    };
  }

  const priceContext = await loadPriceContext(
    deps.priceProvider,
    instrument.ticker,
  );

  const empty = stories.length === 0;
  return {
    status: "ok",
    ticker: instrument.ticker,
    empty,
    stories,
    emptyStateMessage: empty ? INSTRUMENT_EMPTY_STATE_MESSAGE : "",
    priceContext,
  };
}

async function loadPriceContext(
  provider: PriceContextProvider,
  ticker: string,
): Promise<InstrumentPriceContext> {
  try {
    return await provider.getPriceContext({ ticker });
  } catch {
    return { status: "unavailable" };
  }
}
