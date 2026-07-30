import type { RetailTraderId } from "@/modules/auth/types";

/**
 * Personal (Retail-Trader-scoped) data used by Dashboard surfaces.
 * Implementations must isolate data by retailTraderId (RLS baseline).
 */
export type PersonalSurfaceStore = {
  listWatchlistTickers(retailTraderId: RetailTraderId): Promise<string[]>;
};
