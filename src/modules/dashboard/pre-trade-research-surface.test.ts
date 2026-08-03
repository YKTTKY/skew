import { describe, expect, it } from "vitest";
import { InMemoryInstrumentCatalog } from "@/infrastructure/persistence/in-memory-instrument-catalog";
import { InMemoryPersonalSurfaceStore } from "@/infrastructure/persistence/in-memory-personal-surface";
import { getInstrumentResearch } from "@/modules/dashboard/instrument-research";
import {
  addInstrumentToWatchlist,
  removeInstrumentFromWatchlist,
} from "@/modules/dashboard/watchlist-mutations";
import { searchInstruments } from "@/modules/dashboard/search-instruments";
import { getWatchlistHome } from "@/modules/dashboard/watchlist-home";
import type { RetailTraderSession } from "@/modules/auth/types";

const SEED_INSTRUMENTS = [
  { ticker: "AAPL", name: "Apple Inc.", kind: "equity" as const },
  { ticker: "MSFT", name: "Microsoft Corporation", kind: "equity" as const },
  { ticker: "NVDA", name: "NVIDIA Corporation", kind: "equity" as const },
  { ticker: "SPY", name: "SPDR S&P 500 ETF Trust", kind: "etf" as const },
  { ticker: "QQQ", name: "Invesco QQQ Trust", kind: "etf" as const },
];

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

/**
 * Seam: Retail Trader Pre-Trade Research surface (Watchlist mutations).
 * Asserts add/remove and isolation via application APIs — not store internals.
 */
describe("Pre-Trade Research surface — Watchlist management", () => {
  it("lets a Retail Trader add a known Instrument and see it on home", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    const addResult = await addInstrumentToWatchlist(
      session,
      store,
      catalog,
      "aapl",
    );

    expect(addResult).toEqual({
      status: "ok",
      instruments: [{ ticker: "AAPL" }],
    });

    const home = await getWatchlistHome(session, store);
    expect(home).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "AAPL" }],
      emptyStateMessage: "",
    });
  });

  it("lets a Retail Trader remove an Instrument and return to empty home", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    await addInstrumentToWatchlist(session, store, catalog, "SPY");
    await addInstrumentToWatchlist(session, store, catalog, "QQQ");

    const removeResult = await removeInstrumentFromWatchlist(
      session,
      store,
      "spy",
    );

    expect(removeResult).toEqual({
      status: "ok",
      instruments: [{ ticker: "QQQ" }],
    });

    await removeInstrumentFromWatchlist(session, store, "QQQ");

    const home = await getWatchlistHome(session, store);
    expect(home).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
    });
  });

  it("rejects adding an unknown ticker", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    const result = await addInstrumentToWatchlist(
      session,
      store,
      catalog,
      "NOTREAL",
    );

    expect(result).toEqual({ status: "unknown_instrument" });

    const home = await getWatchlistHome(session, store);
    expect(home).toMatchObject({ status: "ok", empty: true, instruments: [] });
  });

  it("denies unauthenticated Watchlist mutations and Instrument search", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);

    expect(
      await addInstrumentToWatchlist(null, store, catalog, "AAPL"),
    ).toEqual({ status: "unauthenticated" });
    expect(await removeInstrumentFromWatchlist(null, store, "AAPL")).toEqual({
      status: "unauthenticated",
    });
    expect(await searchInstruments(null, catalog, "AA")).toEqual({
      status: "unauthenticated",
    });
  });

  it("lets a Retail Trader search US equity and ETF Instruments by ticker", async () => {
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const session: RetailTraderSession = { retailTraderId: "trader_alice" };

    const result = await searchInstruments(session, catalog, "q");

    expect(result).toEqual({
      status: "ok",
      results: [
        {
          ticker: "QQQ",
          name: "Invesco QQQ Trust",
          kind: "etf",
        },
      ],
    });
  });

  it("does not let one Retail Trader mutate another’s Watchlist", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const alice: RetailTraderSession = { retailTraderId: "trader_alice" };
    const bob: RetailTraderSession = { retailTraderId: "trader_bob" };

    await addInstrumentToWatchlist(bob, store, catalog, "MSFT");
    await addInstrumentToWatchlist(bob, store, catalog, "NVDA");

    await addInstrumentToWatchlist(alice, store, catalog, "AAPL");
    await removeInstrumentFromWatchlist(alice, store, "MSFT");

    const bobHome = await getWatchlistHome(bob, store);
    const aliceHome = await getWatchlistHome(alice, store);

    expect(bobHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "MSFT" }, { ticker: "NVDA" }],
      emptyStateMessage: "",
    });
    expect(aliceHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "AAPL" }],
      emptyStateMessage: "",
    });
  });
});
