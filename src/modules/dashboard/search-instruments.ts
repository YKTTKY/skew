import type { AuthSession } from "@/modules/auth/types";
import type {
  InstrumentCatalog,
  InstrumentRecord,
} from "@/modules/dashboard/instrument-catalog";

export type SearchInstrumentsResult =
  | { status: "unauthenticated" }
  | { status: "ok"; results: InstrumentRecord[] };

/**
 * Search known US equity/ETF Instruments by ticker prefix for Watchlist management.
 * Requires a signed-in Retail Trader; results are not personal data but auth-gated with the surface.
 */
export async function searchInstruments(
  session: AuthSession,
  catalog: InstrumentCatalog,
  query: string,
): Promise<SearchInstrumentsResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const results = await catalog.searchByTickerPrefix(query);
  return { status: "ok", results };
}
