import type { AuthSession } from "@/modules/auth/types";
import type { InstrumentCatalog } from "@/modules/dashboard/instrument-catalog";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import type { WatchlistHomeInstrument } from "@/modules/dashboard/watchlist-home";

export type AddInstrumentToWatchlistResult =
  | { status: "unauthenticated" }
  | { status: "unknown_instrument" }
  | { status: "ok"; instruments: WatchlistHomeInstrument[] };

export type RemoveInstrumentFromWatchlistResult =
  | { status: "unauthenticated" }
  | { status: "ok"; instruments: WatchlistHomeInstrument[] };

/**
 * Add a known US equity/ETF Instrument to the signed-in Retail Trader's Watchlist.
 * Unknown tickers are rejected; membership is scoped strictly to the session subject.
 */
export async function addInstrumentToWatchlist(
  session: AuthSession,
  store: PersonalSurfaceStore,
  catalog: InstrumentCatalog,
  ticker: string,
): Promise<AddInstrumentToWatchlistResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const instrument = await catalog.findByTicker(ticker);
  if (!instrument) {
    return { status: "unknown_instrument" };
  }

  await store.addWatchlistTicker(session.retailTraderId, instrument.ticker);
  const tickers = await store.listWatchlistTickers(session.retailTraderId);

  return {
    status: "ok",
    instruments: tickers.map((t) => ({ ticker: t })),
  };
}

/**
 * Remove an Instrument from the signed-in Retail Trader's Watchlist.
 * Scoped strictly to the session subject (behavior-level isolation).
 */
export async function removeInstrumentFromWatchlist(
  session: AuthSession,
  store: PersonalSurfaceStore,
  ticker: string,
): Promise<RemoveInstrumentFromWatchlistResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const normalized = ticker.trim().toUpperCase();
  await store.removeWatchlistTicker(session.retailTraderId, normalized);
  const tickers = await store.listWatchlistTickers(session.retailTraderId);

  return {
    status: "ok",
    instruments: tickers.map((t) => ({ ticker: t })),
  };
}
