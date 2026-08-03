import { describe, expect, it } from "vitest";
import { InMemoryInstrumentCatalog } from "@/infrastructure/persistence/in-memory-instrument-catalog";
import { InMemoryPersonalSurfaceStore } from "@/infrastructure/persistence/in-memory-personal-surface";
import {
  FailingResearchSurfaceStore,
  InMemoryResearchSurfaceStore,
} from "@/infrastructure/persistence/in-memory-research-surface";
import {
  SEED_AS_OF_ISO,
  buildSeedResearchStories,
} from "@/infrastructure/persistence/seed-research";
import {
  getInstrumentResearch,
  type InstrumentResearchDeps,
} from "@/modules/dashboard/instrument-research";
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

const EXPECTED_INSTRUMENT_UNKNOWN_MESSAGE =
  "That ticker is not a known Instrument. Check the symbol or search from Watchlist.";

const EXPECTED_INSTRUMENT_LOAD_ERROR_MESSAGE =
  "We could not load Pre-Trade Research for this Instrument. Try again in a moment.";

/** Soft recommendation language that must never appear in trader-facing research copy. */
const RECOMMENDATION_LANGUAGE =
  /\b(buy|sell|hold)\b|\bshould (buy|sell|act|trade)\b|\brecommend(ed|ation)?\b/i;

const AS_OF = new Date(SEED_AS_OF_ISO);

function emptyResearchDeps(): InstrumentResearchDeps {
  return {
    catalog: new InMemoryInstrumentCatalog(SEED_INSTRUMENTS),
    researchStore: new InMemoryResearchSurfaceStore([]),
    asOf: AS_OF,
  };
}

function seededResearchDeps(
  overrides?: Partial<InstrumentResearchDeps>,
): InstrumentResearchDeps {
  return {
    catalog: new InMemoryInstrumentCatalog(SEED_INSTRUMENTS),
    researchStore: new InMemoryResearchSurfaceStore(
      buildSeedResearchStories(AS_OF),
    ),
    asOf: AS_OF,
    ...overrides,
  };
}

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
    const result = await getInstrumentResearch(null, "AAPL", emptyResearchDeps());

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

    const result = await getInstrumentResearch(
      session,
      "aapl",
      emptyResearchDeps(),
    );

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

/**
 * Seam: Retail Trader Pre-Trade Research surface (Instrument View from seeded research).
 * Asserts Stories, scores, Research Window, and error states via getInstrumentResearch —
 * not store internals or React trees.
 */
describe("Pre-Trade Research surface — Instrument View seeded research", () => {
  const session: RetailTraderSession = { retailTraderId: "trader_alice" };

  it("opens Instrument View Stories for a known Instrument without Watchlist membership", async () => {
    const result = await getInstrumentResearch(
      session,
      "aapl",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.ticker).toBe("AAPL");
    expect(result.empty).toBe(false);
    expect(result.stories.map((s) => s.id)).toEqual([
      "story-aapl-product",
      "story-ma-aapl-msft",
    ]);
  });

  it("excludes Stories outside the Research Window (~90 days)", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.stories.map((s) => s.id)).not.toContain("story-aapl-stale");
    expect(
      result.stories.every(
        (s) => Date.parse(s.updatedAt) >= AS_OF.getTime() - 90 * 24 * 60 * 60 * 1000,
      ),
    ).toBe(true);
  });

  it("shows Story × Instrument rollups and Article × Instrument breakdowns", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const product = result.stories.find((s) => s.id === "story-aapl-product");
    expect(product).toMatchObject({
      title: "Apple unveils next iPhone generation",
      bias: {
        label: "bullish",
        rationale:
          "Coverage frames product demand and pricing power as constructive for Apple.",
      },
      sentiment: {
        label: "calm",
        rationale:
          "Tone across outlets is measured product reporting rather than alarm.",
      },
    });
    expect(product?.articles).toHaveLength(2);
    expect(product?.articles[0]).toMatchObject({
      id: "article-aapl-reuters-wsj",
      bias: {
        label: "bullish",
        rationale:
          "Emphasizes pre-order strength and upgrade cycle timing for Apple.",
      },
      sentiment: {
        label: "calm",
        rationale: "Straight news diction with limited emotional intensifiers.",
      },
    });
  });

  it("keeps Bias and Sentiment independent and always includes Rationales", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const bloomberg = result.stories
      .flatMap((s) => s.articles)
      .find((a) => a.id === "article-aapl-bloomberg");

    // Same Article: bullish Bias with neutral Sentiment — axes are independent.
    expect(bloomberg?.bias.label).toBe("bullish");
    expect(bloomberg?.sentiment.label).toBe("neutral");
    expect(bloomberg?.bias.rationale.length).toBeGreaterThan(0);
    expect(bloomberg?.sentiment.rationale.length).toBeGreaterThan(0);
  });

  it("shows multiple Source attributions on a deduped Article", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const deduped = result.stories
      .flatMap((s) => s.articles)
      .find((a) => a.id === "article-aapl-reuters-wsj");

    expect(deduped?.sources).toEqual(["Reuters", "The Wall Street Journal"]);
  });

  it("allows different scores per Instrument on the same multi-Instrument Story", async () => {
    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      seededResearchDeps(),
    );

    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    if (aapl.status !== "ok" || msft.status !== "ok") return;

    const aaplMa = aapl.stories.find((s) => s.id === "story-ma-aapl-msft");
    const msftMa = msft.stories.find((s) => s.id === "story-ma-aapl-msft");

    expect(aaplMa?.bias.label).toBe("bearish");
    expect(aaplMa?.sentiment.label).toBe("alarmist");
    expect(msftMa?.bias.label).toBe("neutral");
    expect(msftMa?.sentiment.label).toBe("calm");

    expect(aaplMa?.articles[0]?.bias.label).toBe("bearish");
    expect(msftMa?.articles[0]?.bias.label).toBe("neutral");
  });

  it("never surfaces unlinked Articles on the Instrument View", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps(),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const allArticleIds = result.stories.flatMap((s) => s.articles.map((a) => a.id));
    expect(allArticleIds).not.toContain("article-unlinked");
    expect(result.stories.map((s) => s.id)).not.toContain("story-unlinked-noise");
  });

  it("returns a clear unknown-Instrument state for inaccessible tickers", async () => {
    const result = await getInstrumentResearch(
      session,
      "NOTREAL",
      seededResearchDeps(),
    );

    expect(result).toEqual({
      status: "unknown_instrument",
      ticker: "NOTREAL",
      message: EXPECTED_INSTRUMENT_UNKNOWN_MESSAGE,
    });
  });

  it("returns a clear recoverable error when research data fails to load", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({
        researchStore: new FailingResearchSurfaceStore(),
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: EXPECTED_INSTRUMENT_LOAD_ERROR_MESSAGE,
    });
  });

  it("keeps Instrument View copy free of trade recommendations", async () => {
    const ok = await getInstrumentResearch(session, "AAPL", seededResearchDeps());
    const empty = await getInstrumentResearch(
      session,
      "NVDA",
      seededResearchDeps(),
    );
    const unknown = await getInstrumentResearch(
      session,
      "FAKE",
      seededResearchDeps(),
    );
    const failed = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({
        researchStore: new FailingResearchSurfaceStore(),
      }),
    );

    const copySnippets: string[] = [];

    if (ok.status === "ok") {
      copySnippets.push(ok.emptyStateMessage);
      for (const story of ok.stories) {
        copySnippets.push(
          story.title,
          story.bias.rationale,
          story.sentiment.rationale,
        );
        for (const article of story.articles) {
          copySnippets.push(
            article.title,
            article.bias.rationale,
            article.sentiment.rationale,
            ...article.sources,
          );
        }
      }
    }
    if (empty.status === "ok") {
      copySnippets.push(empty.emptyStateMessage);
    }
    if (unknown.status === "unknown_instrument") {
      copySnippets.push(unknown.message);
    }
    if (failed.status === "error") {
      copySnippets.push(failed.message);
    }

    for (const text of copySnippets) {
      expect(text).not.toMatch(RECOMMENDATION_LANGUAGE);
    }
  });
});
