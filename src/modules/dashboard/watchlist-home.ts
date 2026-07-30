import type { AuthSession } from "@/modules/auth/types";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";

export type WatchlistHomeInstrument = {
  ticker: string;
};

export type WatchlistHomeResult =
  | { status: "unauthenticated" }
  | {
      status: "ok";
      empty: boolean;
      instruments: WatchlistHomeInstrument[];
      emptyStateMessage: string;
    };

/** Clear empty-state copy for a signed-in Retail Trader with no Watchlist Instruments. */
export const WATCHLIST_EMPTY_STATE_MESSAGE =
  "Your Watchlist is empty. Add US equities or ETFs to prioritize Pre-Trade Research on your Dashboard.";

/**
 * Watchlist home for the Pre-Trade Research surface.
 * Unauthenticated callers are denied; authenticated callers see only their own Watchlist.
 */
export async function getWatchlistHome(
  session: AuthSession,
  store: PersonalSurfaceStore,
): Promise<WatchlistHomeResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const tickers = await store.listWatchlistTickers(session.retailTraderId);
  const instruments = tickers.map((ticker) => ({ ticker }));
  const empty = instruments.length === 0;

  return {
    status: "ok",
    empty,
    instruments,
    emptyStateMessage: empty ? WATCHLIST_EMPTY_STATE_MESSAGE : "",
  };
}
