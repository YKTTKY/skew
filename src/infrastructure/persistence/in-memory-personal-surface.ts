import type { RetailTraderId } from "@/modules/auth/types";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";

/**
 * In-memory PersonalSurfaceStore for tests and local development.
 * Data is keyed strictly by retailTraderId (identity isolation baseline).
 */
export class InMemoryPersonalSurfaceStore implements PersonalSurfaceStore {
  private readonly watchlists = new Map<RetailTraderId, string[]>();

  async listWatchlistTickers(retailTraderId: RetailTraderId): Promise<string[]> {
    return [...(this.watchlists.get(retailTraderId) ?? [])];
  }

  /** Test/dev seeder — not part of the trader-facing product API. */
  seedWatchlist(retailTraderId: RetailTraderId, tickers: string[]): void {
    this.watchlists.set(
      retailTraderId,
      tickers.map((t) => t.trim().toUpperCase()),
    );
  }
}
