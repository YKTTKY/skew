import type { AuthSession } from "@/modules/auth/types";

export type InstrumentResearchResult =
  | { status: "unauthenticated" }
  | {
      status: "ok";
      ticker: string;
      empty: boolean;
      stories: [];
      emptyStateMessage: string;
    };

/** Empty Instrument View copy until Stories exist for the Instrument. */
export const INSTRUMENT_EMPTY_STATE_MESSAGE =
  "No Stories yet for this Instrument within the Research Window.";

/**
 * Instrument research surface (Instrument View entry).
 * Requires authentication; unauthenticated visitors cannot open research data.
 */
export async function getInstrumentResearch(
  session: AuthSession,
  ticker: string,
): Promise<InstrumentResearchResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const normalized = ticker.trim().toUpperCase();

  return {
    status: "ok",
    ticker: normalized,
    empty: true,
    stories: [],
    emptyStateMessage: INSTRUMENT_EMPTY_STATE_MESSAGE,
  };
}
