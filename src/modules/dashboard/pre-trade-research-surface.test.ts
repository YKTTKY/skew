import { describe, expect, it } from "vitest";
import { InMemoryPersonalSurfaceStore } from "@/infrastructure/persistence/in-memory-personal-surface";
import { getInstrumentResearch } from "@/modules/dashboard/instrument-research";
import { getWatchlistHome } from "@/modules/dashboard/watchlist-home";
import type { RetailTraderSession } from "@/modules/auth/types";

/** Independent expected copy — not imported from production modules (avoids tautological tests). */
const EXPECTED_WATCHLIST_EMPTY_MESSAGE =
  "Your Watchlist is empty. Add US equities or ETFs to prioritize Pre-Trade Research on your Dashboard.";

const EXPECTED_INSTRUMENT_EMPTY_MESSAGE =
  "No Stories yet for this Instrument within the Research Window.";

/**
 * Seam: Retail Trader Pre-Trade Research surface (auth gate, empty home, identity isolation).
 * Asserts observable Dashboard behavior — not Clerk/Supabase SDK internals.
 */
describe("Pre-Trade Research surface — auth gate", () => {
  it("denies unauthenticated access to Watchlist home", async () => {
    const store = new InMemoryPersonalSurfaceStore();

    const result = await getWatchlistHome(null, store);

    expect(result).toEqual({ status: "unauthenticated" });
  });

  it("denies unauthenticated access to Instrument research", async () => {
    const result = await getInstrumentResearch(null, "AAPL");

    expect(result).toEqual({ status: "unauthenticated" });
  });
});

describe("Pre-Trade Research surface — authenticated empty home", () => {
  it("shows a clear empty state when the Retail Trader has no Watchlist Instruments", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    const result = await getWatchlistHome(session, store);

    expect(result).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
    });
  });

  it("opens Instrument research for a signed-in Retail Trader with an empty Stories state", async () => {
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    const result = await getInstrumentResearch(session, "aapl");

    expect(result).toEqual({
      status: "ok",
      ticker: "AAPL",
      empty: true,
      stories: [],
      emptyStateMessage: EXPECTED_INSTRUMENT_EMPTY_MESSAGE,
    });
  });
});

describe("Pre-Trade Research surface — identity isolation", () => {
  it("does not let one Retail Trader observe another’s Watchlist data", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    store.seedWatchlist("trader_bob", ["MSFT", "NVDA"]);

    const alice: RetailTraderSession = { retailTraderId: "trader_alice" };
    const bob: RetailTraderSession = { retailTraderId: "trader_bob" };

    const aliceHome = await getWatchlistHome(alice, store);
    const bobHome = await getWatchlistHome(bob, store);

    expect(aliceHome).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
    });

    expect(bobHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "MSFT" }, { ticker: "NVDA" }],
      emptyStateMessage: "",
    });

    if (aliceHome.status === "ok") {
      expect(aliceHome.instruments.map((i) => i.ticker)).not.toContain("MSFT");
      expect(aliceHome.instruments.map((i) => i.ticker)).not.toContain("NVDA");
    }
  });
});
