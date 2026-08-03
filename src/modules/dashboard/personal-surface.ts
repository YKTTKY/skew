import type { RetailTraderId } from "@/modules/auth/types";

/**
 * Personal (Retail-Trader-scoped) data used by Dashboard surfaces.
 * Implementations must isolate data by retailTraderId (RLS / behavior-level).
 */
export type PersonalSurfaceStore = {
  listWatchlistTickers(retailTraderId: RetailTraderId): Promise<string[]>;
  addWatchlistTicker(
    retailTraderId: RetailTraderId,
    ticker: string,
  ): Promise<void>;
  removeWatchlistTicker(
    retailTraderId: RetailTraderId,
    ticker: string,
  ): Promise<void>;
};
