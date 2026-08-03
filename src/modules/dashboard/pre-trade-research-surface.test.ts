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
  FailingPriceContextProvider,
  FakePriceContextProvider,
} from "@/infrastructure/price/fake-price-context-provider";
import { buildSeedPriceContextQuotes } from "@/infrastructure/price/seed-price-context";
import { FakeAiPort } from "@/infrastructure/ai/fake-ai-port";
import { InMemoryPipelineBatchStore } from "@/infrastructure/pipeline/in-memory-batch-store";
import { buildPipelineFixtureFeed } from "@/infrastructure/pipeline/fixture-sources";
import { InMemoryJobQueue } from "@/infrastructure/queue/in-memory-job-queue";
import {
  getInstrumentResearch,
  type InstrumentResearchDeps,
} from "@/modules/dashboard/instrument-research";
import { enqueueFixtureIngest } from "@/modules/pipeline/enqueue-fixture";
import { registerPipelineWorkers } from "@/modules/pipeline/register-workers";
import {
  addInstrumentToWatchlist,
  removeInstrumentFromWatchlist,
} from "@/modules/dashboard/watchlist-mutations";
import { searchInstruments } from "@/modules/dashboard/search-instruments";
import {
  getWatchlistHome,
  type WatchlistHomeDeps,
} from "@/modules/dashboard/watchlist-home";
import type { RetailTraderSession } from "@/modules/auth/types";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import type { PriceContextProvider } from "@/modules/dashboard/price-context";
import type { ResearchSurfaceStore } from "@/modules/dashboard/research-surface";

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

const EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE =
  "No Stories yet for your Watchlist Instruments within the Research Window. Open an Instrument View for deeper context, or check back as coverage is linked and scored.";

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

function emptyResearchStore(): ResearchSurfaceStore {
  return new InMemoryResearchSurfaceStore([]);
}

function seededResearchStore(): ResearchSurfaceStore {
  return new InMemoryResearchSurfaceStore(buildSeedResearchStories(AS_OF));
}

/** Default fake has no quotes — Price Context unavailable unless a test injects seed. */
function unavailablePriceProvider(): PriceContextProvider {
  return new FakePriceContextProvider({});
}

function seededPriceProvider(): PriceContextProvider {
  return new FakePriceContextProvider(buildSeedPriceContextQuotes(AS_OF));
}

function homeDeps(
  personalStore: PersonalSurfaceStore,
  researchStore: ResearchSurfaceStore = emptyResearchStore(),
): WatchlistHomeDeps {
  return {
    personalStore,
    researchStore,
    asOf: AS_OF,
  };
}

function emptyResearchDeps(
  overrides?: Partial<InstrumentResearchDeps>,
): InstrumentResearchDeps {
  return {
    catalog: new InMemoryInstrumentCatalog(SEED_INSTRUMENTS),
    researchStore: emptyResearchStore(),
    priceProvider: unavailablePriceProvider(),
    asOf: AS_OF,
    ...overrides,
  };
}

function seededResearchDeps(
  overrides?: Partial<InstrumentResearchDeps>,
): InstrumentResearchDeps {
  return {
    catalog: new InMemoryInstrumentCatalog(SEED_INSTRUMENTS),
    researchStore: seededResearchStore(),
    priceProvider: unavailablePriceProvider(),
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

    const result = await getWatchlistHome(null, homeDeps(store));

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

    const result = await getWatchlistHome(session, homeDeps(store));

    expect(result).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
      stories: [],
      noCoverage: false,
      noCoverageMessage: "",
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
      priceContext: { status: "unavailable" },
    });
  });
});

describe("Pre-Trade Research surface — identity isolation", () => {
  it("does not let one Retail Trader observe another’s Watchlist data", async () => {
    const store = new InMemoryPersonalSurfaceStore();
    store.seedWatchlist("trader_bob", ["MSFT", "NVDA"]);

    const alice: RetailTraderSession = { retailTraderId: "trader_alice" };
    const bob: RetailTraderSession = { retailTraderId: "trader_bob" };

    const aliceHome = await getWatchlistHome(alice, homeDeps(store));
    const bobHome = await getWatchlistHome(bob, homeDeps(store));

    expect(aliceHome).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
      stories: [],
      noCoverage: false,
      noCoverageMessage: "",
    });

    expect(bobHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "MSFT" }, { ticker: "NVDA" }],
      emptyStateMessage: "",
      stories: [],
      noCoverage: true,
      noCoverageMessage: EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE,
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

    const home = await getWatchlistHome(session, homeDeps(store));
    expect(home).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "AAPL" }],
      emptyStateMessage: "",
      stories: [],
      noCoverage: true,
      noCoverageMessage: EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE,
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

    const home = await getWatchlistHome(session, homeDeps(store));
    expect(home).toEqual({
      status: "ok",
      empty: true,
      instruments: [],
      emptyStateMessage: EXPECTED_WATCHLIST_EMPTY_MESSAGE,
      stories: [],
      noCoverage: false,
      noCoverageMessage: "",
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

    const home = await getWatchlistHome(session, homeDeps(store));
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

    const bobHome = await getWatchlistHome(bob, homeDeps(store));
    const aliceHome = await getWatchlistHome(alice, homeDeps(store));

    expect(bobHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "MSFT" }, { ticker: "NVDA" }],
      emptyStateMessage: "",
      stories: [],
      noCoverage: true,
      noCoverageMessage: EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE,
    });
    expect(aliceHome).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "AAPL" }],
      emptyStateMessage: "",
      stories: [],
      noCoverage: true,
      noCoverageMessage: EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE,
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

/**
 * Seam: Retail Trader Pre-Trade Research surface (Price Context on Instrument View).
 * Asserts last price + simple chart series via getInstrumentResearch with a fake
 * price provider — not vendor SDKs or chart library internals. Price failures
 * must never block Stories, scores, or Rationales.
 */
describe("Pre-Trade Research surface — Price Context on Instrument View", () => {
  const session: RetailTraderSession = { retailTraderId: "trader_alice" };

  it("shows last price suitable for orientation when quotes are available", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({ priceProvider: seededPriceProvider() }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.priceContext).toEqual({
      status: "available",
      lastPrice: 214.5,
      currency: "USD",
      asOf: AS_OF.toISOString(),
      series: [
        { at: "2026-07-28T12:00:00.000Z", price: 208.2 },
        { at: "2026-07-29T12:00:00.000Z", price: 209.8 },
        { at: "2026-07-30T12:00:00.000Z", price: 211.1 },
        { at: "2026-07-31T12:00:00.000Z", price: 210.4 },
        { at: "2026-08-01T12:00:00.000Z", price: 212.7 },
        { at: "2026-08-02T12:00:00.000Z", price: 213.9 },
        { at: "2026-08-03T12:00:00.000Z", price: 214.5 },
      ],
    });
  });

  it("includes a simple orientation chart series (not a TA terminal)", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({ priceProvider: seededPriceProvider() }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.priceContext.status).toBe("available");
    if (result.priceContext.status !== "available") return;

    const { series, lastPrice } = result.priceContext;
    // Lightweight path only — enough points to orient, not a full history workstation.
    expect(series.length).toBeGreaterThanOrEqual(2);
    expect(series.length).toBeLessThanOrEqual(14);
    expect(series[series.length - 1]?.price).toBe(lastPrice);
    // Chronological order for a simple chart.
    for (let i = 1; i < series.length; i++) {
      expect(Date.parse(series[i]!.at)).toBeGreaterThanOrEqual(
        Date.parse(series[i - 1]!.at),
      );
    }
  });

  it("does not block Stories, scores, or Rationales when Price Context is unavailable", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({ priceProvider: unavailablePriceProvider() }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.priceContext).toEqual({ status: "unavailable" });
    // Coverage still loads for Pre-Trade Research.
    expect(result.empty).toBe(false);
    expect(result.stories.map((s) => s.id)).toEqual([
      "story-aapl-product",
      "story-ma-aapl-msft",
    ]);
    const product = result.stories.find((s) => s.id === "story-aapl-product");
    expect(product?.bias.label).toBe("bullish");
    expect(product?.bias.rationale.length).toBeGreaterThan(0);
    expect(product?.sentiment.rationale.length).toBeGreaterThan(0);
    expect(product?.articles.length).toBeGreaterThan(0);
  });

  it("does not block coverage when the price provider throws", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      seededResearchDeps({
        priceProvider: new FailingPriceContextProvider(),
      }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.priceContext).toEqual({ status: "unavailable" });
    expect(result.stories.length).toBeGreaterThan(0);
    expect(result.stories[0]?.bias.rationale.length).toBeGreaterThan(0);
  });

  it("still shows Price Context when the Instrument has no Stories yet", async () => {
    const result = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ priceProvider: seededPriceProvider() }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.empty).toBe(true);
    expect(result.stories).toEqual([]);
    expect(result.priceContext.status).toBe("available");
    if (result.priceContext.status !== "available") return;
    expect(result.priceContext.lastPrice).toBe(214.5);
  });
});

/**
 * Seam: Retail Trader Pre-Trade Research surface (Watchlist home Stories prioritization).
 * Asserts home prioritizes Stories/scores for Watchlist Instruments, navigation targets,
 * and clear no-coverage states — not React trees or store internals.
 */
describe("Pre-Trade Research surface — Watchlist home Stories", () => {
  const session: RetailTraderSession = { retailTraderId: "trader_alice" };
  const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);

  it("prioritizes Stories and scores for Watchlist Instruments over unrelated coverage", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    await addInstrumentToWatchlist(session, personal, catalog, "AAPL");

    const home = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );

    expect(home.status).toBe("ok");
    if (home.status !== "ok") return;

    expect(home.empty).toBe(false);
    expect(home.noCoverage).toBe(false);
    expect(home.stories.map((s) => s.id)).toEqual([
      "story-aapl-product",
      "story-ma-aapl-msft",
    ]);
    // Unrelated / unlinked coverage never appears on home.
    expect(home.stories.map((s) => s.id)).not.toContain("story-unlinked-noise");
    expect(home.stories.map((s) => s.id)).not.toContain("story-aapl-stale");
    // Only Watchlist Instrument scores on multi-Instrument Stories.
    const ma = home.stories.find((s) => s.id === "story-ma-aapl-msft");
    expect(ma?.relatedInstruments.map((i) => i.ticker)).toEqual(["AAPL"]);
    expect(ma?.relatedInstruments[0]).toMatchObject({
      ticker: "AAPL",
      bias: {
        label: "bearish",
        rationale:
          "For Apple, coverage stresses scrutiny risk and possible deal friction.",
      },
      sentiment: {
        label: "alarmist",
        rationale:
          "Language around enforcement and delays is elevated for Apple.",
      },
    });
  });

  it("does not surface Stories for Instruments not on the Retail Trader’s Watchlist", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    // SPY is known but has no exclusive stories; MSFT stories must not appear without MSFT on list.
    // Alice follows only SPY — seeded corpus has no SPY Stories.
    await addInstrumentToWatchlist(session, personal, catalog, "SPY");

    const home = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );

    expect(home.status).toBe("ok");
    if (home.status !== "ok") return;

    expect(home.instruments).toEqual([{ ticker: "SPY" }]);
    expect(home.stories).toEqual([]);
    // AAPL-only Stories must not leak onto a SPY-only Watchlist.
    expect(home.stories.map((s) => s.id)).not.toContain("story-aapl-product");
    expect(home.stories.map((s) => s.id)).not.toContain("story-ma-aapl-msft");
  });

  it("shows clear no-coverage state when Watchlist has Instruments but little news", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    await addInstrumentToWatchlist(session, personal, catalog, "NVDA");
    await addInstrumentToWatchlist(session, personal, catalog, "QQQ");

    const home = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );

    expect(home).toEqual({
      status: "ok",
      empty: false,
      instruments: [{ ticker: "NVDA" }, { ticker: "QQQ" }],
      emptyStateMessage: "",
      stories: [],
      noCoverage: true,
      noCoverageMessage: EXPECTED_WATCHLIST_NO_COVERAGE_MESSAGE,
    });
  });

  it("exposes Instrument navigation targets from home Stories and Watchlist set", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    await addInstrumentToWatchlist(session, personal, catalog, "AAPL");
    await addInstrumentToWatchlist(session, personal, catalog, "MSFT");

    const home = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );

    expect(home.status).toBe("ok");
    if (home.status !== "ok") return;

    // Watchlist Instruments are navigation targets into Instrument View.
    expect(home.instruments.map((i) => i.ticker)).toEqual(["AAPL", "MSFT"]);

    const product = home.stories.find((s) => s.id === "story-aapl-product");
    expect(product).toMatchObject({
      id: "story-aapl-product",
      title: "Apple unveils next iPhone generation",
    });
    expect(product?.relatedInstruments.map((i) => i.ticker)).toEqual(["AAPL"]);

    const ma = home.stories.find((s) => s.id === "story-ma-aapl-msft");
    // Both Watchlist Instruments appear as navigation targets with their own scores.
    expect(ma?.relatedInstruments.map((i) => i.ticker).sort()).toEqual([
      "AAPL",
      "MSFT",
    ]);
    expect(ma?.relatedInstruments.find((i) => i.ticker === "MSFT")).toMatchObject({
      bias: { label: "neutral" },
      sentiment: { label: "calm" },
    });
  });

  it("orders home Stories freshest-first for scanning", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    await addInstrumentToWatchlist(session, personal, catalog, "AAPL");

    const home = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );

    expect(home.status).toBe("ok");
    if (home.status !== "ok") return;

    expect(home.stories.map((s) => s.id)).toEqual([
      "story-aapl-product", // 3 days before asOf
      "story-ma-aapl-msft", // 10 days before asOf
    ]);
    for (let i = 1; i < home.stories.length; i++) {
      expect(Date.parse(home.stories[i - 1]!.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(home.stories[i]!.updatedAt),
      );
    }
  });

  it("keeps Watchlist home copy free of trade recommendations", async () => {
    const personal = new InMemoryPersonalSurfaceStore();
    await addInstrumentToWatchlist(session, personal, catalog, "AAPL");

    const withStories = await getWatchlistHome(
      session,
      homeDeps(personal, seededResearchStore()),
    );
    const noCoverage = await getWatchlistHome(
      session,
      homeDeps(
        (() => {
          const p = new InMemoryPersonalSurfaceStore();
          p.seedWatchlist("trader_alice", ["NVDA"]);
          return p;
        })(),
        seededResearchStore(),
      ),
    );
    const empty = await getWatchlistHome(
      session,
      homeDeps(new InMemoryPersonalSurfaceStore(), seededResearchStore()),
    );

    const copySnippets: string[] = [];
    for (const result of [withStories, noCoverage, empty]) {
      if (result.status !== "ok") continue;
      copySnippets.push(result.emptyStateMessage, result.noCoverageMessage);
      for (const story of result.stories) {
        copySnippets.push(story.title);
        for (const related of story.relatedInstruments) {
          copySnippets.push(
            related.bias.rationale,
            related.sentiment.rationale,
          );
        }
      }
    }

    for (const text of copySnippets) {
      expect(text).not.toMatch(RECOMMENDATION_LANGUAGE);
    }
  });
});

/**
 * Seam: Retail Trader Pre-Trade Research surface after thin pipeline jobs run.
 * Asserts trader-visible Instrument View outcomes from fixture Source ingest
 * through score — not queue row formats or AI vendor SDK shapes.
 */
describe("Pre-Trade Research surface — thin pipeline fixture to scores", () => {
  const session: RetailTraderSession = { retailTraderId: "trader_alice" };

  /**
   * Independent expected scores/rationales for the fixture + FakeAiPort map.
   * Not imported from production score tables (avoids tautological tests).
   */
  const EXPECTED_AAPL_SERVICES_BIAS_RATIONALE =
    "Coverage frames services growth and recurring revenue as constructive for Apple.";
  const EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE =
    "Tone stays measured product and financial reporting rather than alarm.";
  const EXPECTED_MSFT_CLOUD_BIAS_RATIONALE =
    "Pieces treat cloud demand commentary as balanced for Microsoft with limited franchise tilt.";
  const EXPECTED_MSFT_CLOUD_SENTIMENT_RATIONALE =
    "Language around Microsoft cloud is process-oriented and calm.";
  const EXPECTED_AAPL_MA_BIAS_RATIONALE =
    "For Apple, coverage stresses scrutiny risk and possible deal friction.";
  const EXPECTED_AAPL_MA_SENTIMENT_RATIONALE =
    "Language around enforcement and delays is elevated for Apple.";
  const EXPECTED_MSFT_MA_BIAS_RATIONALE =
    "For Microsoft, pieces treat the talks as procedural with limited franchise impact.";
  const EXPECTED_MSFT_MA_SENTIMENT_RATIONALE =
    "Microsoft-framed passages stay measured and process-oriented.";

  function pipelineHarness() {
    const researchStore = new InMemoryResearchSurfaceStore([]);
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const queue = new InMemoryJobQueue();
    const ai = new FakeAiPort({
      scoresByTitleAndTicker: {
        "Apple expands services revenue|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_SERVICES_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE,
        },
        // Related multi-Article Story member (same event; rollup stays bullish/calm).
        "Services mix lifts Apple as hardware stays steady|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_SERVICES_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE,
        },
        "Suppliers note steady component orders for phones|AAPL": {
          bias: "bullish",
          biasRationale:
            "Supplier order commentary implies steady unit expectations for Apple.",
          sentiment: "neutral",
          sentimentRationale:
            "Operational supply-chain language without strong emotional framing.",
        },
        "Antitrust officials examine tech partnership terms|AAPL": {
          bias: "bearish",
          biasRationale: EXPECTED_AAPL_MA_BIAS_RATIONALE,
          sentiment: "alarmist",
          sentimentRationale: EXPECTED_AAPL_MA_SENTIMENT_RATIONALE,
        },
        "Antitrust officials examine tech partnership terms|MSFT": {
          bias: "neutral",
          biasRationale: EXPECTED_MSFT_MA_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_MSFT_MA_SENTIMENT_RATIONALE,
        },
        "Cloud demand outlook stays mixed into next quarter|MSFT": {
          bias: "neutral",
          biasRationale: EXPECTED_MSFT_CLOUD_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_MSFT_CLOUD_SENTIMENT_RATIONALE,
        },
      },
    });

    registerPipelineWorkers({
      queue,
      ai,
      catalog,
      researchWriter: researchStore,
      batchStore: new InMemoryPipelineBatchStore(),
    });

    return { researchStore, catalog, queue, ai };
  }

  async function runFixturePipeline(
    queue: InMemoryJobQueue,
    asOf: Date = AS_OF,
  ): Promise<void> {
    await enqueueFixtureIngest(queue, buildPipelineFixtureFeed(asOf));
    await queue.drain();
  }

  it("does not populate Instrument View until pipeline jobs are processed", async () => {
    const { researchStore, queue } = pipelineHarness();

    await enqueueFixtureIngest(queue, buildPipelineFixtureFeed(AS_OF));
    // Jobs enqueued but not drained — Dashboard must not block on pipeline work.

    const before = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );

    expect(before.status).toBe("ok");
    if (before.status !== "ok") return;
    expect(before.empty).toBe(true);
    expect(before.stories).toEqual([]);
  });

  it("surfaces scored Stories on Instrument View after fixture Source jobs complete", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const result = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.empty).toBe(false);
    expect(result.stories.length).toBeGreaterThan(0);

    const services = result.stories.find((s) =>
      s.articles.some((a) => a.title === "Apple expands services revenue"),
    );
    expect(services).toBeDefined();
    expect(services?.bias.label).toBe("bullish");
    expect(services?.bias.rationale).toBe(EXPECTED_AAPL_SERVICES_BIAS_RATIONALE);
    expect(services?.sentiment.label).toBe("calm");
    expect(services?.sentiment.rationale).toBe(
      EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE,
    );

    const article = services?.articles.find(
      (a) => a.title === "Apple expands services revenue",
    );
    expect(article?.bias.label).toBe("bullish");
    expect(article?.bias.rationale).toBe(EXPECTED_AAPL_SERVICES_BIAS_RATIONALE);
    expect(article?.sentiment.rationale.length).toBeGreaterThan(0);
  });

  it("collapses near-identical syndication into one Article with multiple Sources", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const result = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const servicesArticles = result.stories
      .flatMap((s) => s.articles)
      .filter((a) => a.title === "Apple expands services revenue");

    expect(servicesArticles).toHaveLength(1);
    expect(servicesArticles[0]?.sources).toEqual([
      "Reuters",
      "The Wall Street Journal",
    ]);
  });

  it("links Articles via explicit tickers, cashtags, and metadata", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    if (aapl.status !== "ok" || msft.status !== "ok") return;

    // Cashtag $AAPL in body → linked.
    expect(
      aapl.stories.some((s) =>
        s.articles.some((a) => a.title === "Apple expands services revenue"),
      ),
    ).toBe(true);

    // Explicit ticker token in body → linked.
    expect(
      aapl.stories.some((s) =>
        s.articles.some(
          (a) => a.title === "Suppliers note steady component orders for phones",
        ),
      ),
    ).toBe(true);

    // metadataTickers only (no ticker in body) → linked to MSFT.
    expect(
      msft.stories.some((s) =>
        s.articles.some(
          (a) => a.title === "Cloud demand outlook stays mixed into next quarter",
        ),
      ),
    ).toBe(true);
  });

  it("never surfaces unlinked Articles after the pipeline runs", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    if (aapl.status !== "ok" || msft.status !== "ok") return;

    const allTitles = [...aapl.stories, ...msft.stories].flatMap((s) =>
      s.articles.map((a) => a.title),
    );
    expect(allTitles).not.toContain(
      "Column without any Instrument markers or metadata",
    );
    expect(allTitles).not.toContain("Weekend weather may slow travel plans");
  });

  it("allows different Article × Instrument scores on a multi-Instrument Story", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    if (aapl.status !== "ok" || msft.status !== "ok") return;

    const aaplMa = aapl.stories.find((s) =>
      s.articles.some(
        (a) => a.title === "Antitrust officials examine tech partnership terms",
      ),
    );
    const msftMa = msft.stories.find((s) =>
      s.articles.some(
        (a) => a.title === "Antitrust officials examine tech partnership terms",
      ),
    );

    expect(aaplMa?.bias.label).toBe("bearish");
    expect(aaplMa?.sentiment.label).toBe("alarmist");
    expect(aaplMa?.bias.rationale).toBe(EXPECTED_AAPL_MA_BIAS_RATIONALE);
    expect(msftMa?.bias.label).toBe("neutral");
    expect(msftMa?.sentiment.label).toBe("calm");
    expect(msftMa?.bias.rationale).toBe(EXPECTED_MSFT_MA_BIAS_RATIONALE);

    expect(aaplMa?.articles[0]?.bias.label).toBe("bearish");
    expect(msftMa?.articles[0]?.bias.label).toBe("neutral");
  });

  it("keeps pipeline Rationales free of trade recommendations", async () => {
    const { researchStore, queue } = pipelineHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );

    const copySnippets: string[] = [];
    for (const view of [aapl, msft]) {
      if (view.status !== "ok") continue;
      for (const story of view.stories) {
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

    expect(copySnippets.length).toBeGreaterThan(0);
    for (const text of copySnippets) {
      expect(text).not.toMatch(RECOMMENDATION_LANGUAGE);
    }
  });
});

/**
 * Seam: Retail Trader Pre-Trade Research surface after linking rules and
 * multi-Article Story clustering (issue 07). Asserts trader-visible outcomes —
 * not alias tables, similarity thresholds, or queue internals.
 */
describe("Pre-Trade Research surface — linking rules and Story clustering", () => {
  const session: RetailTraderSession = { retailTraderId: "trader_alice" };

  const EXPECTED_AAPL_SERVICES_BIAS_RATIONALE =
    "Coverage frames services growth and recurring revenue as constructive for Apple.";
  const EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE =
    "Tone stays measured product and financial reporting rather than alarm.";
  const EXPECTED_AAPL_DEVICE_BIAS_RATIONALE =
    "Coverage frames the hardware refresh as constructive product momentum for Apple.";
  const EXPECTED_AAPL_DEVICE_SENTIMENT_RATIONALE =
    "Tone is measured product reporting without emotional intensifiers.";
  const EXPECTED_AAPL_SERVICES_MIX_BIAS_RATIONALE =
    "Secondary coverage also treats services mix as constructive for Apple.";
  const EXPECTED_AAPL_SERVICES_MIX_SENTIMENT_RATIONALE =
    "Tone remains calm operational commentary on services mix.";
  const EXPECTED_SPY_MACRO_BIAS_RATIONALE =
    "Market-wide coverage frames soft inflation as constructive for broad equity indexes.";
  const EXPECTED_SPY_MACRO_SENTIMENT_RATIONALE =
    "Tone is measured macro reporting rather than alarm.";
  const EXPECTED_QQQ_MACRO_BIAS_RATIONALE =
    "Broad session commentary is constructive for major growth indexes.";
  const EXPECTED_QQQ_MACRO_SENTIMENT_RATIONALE =
    "Macro tone stays calm and process-oriented.";
  const EXPECTED_AAPL_MACRO_LEAD_BIAS_RATIONALE =
    "For Apple, coverage stresses leadership in large-cap gains during a broad session.";
  const EXPECTED_AAPL_MACRO_LEAD_SENTIMENT_RATIONALE =
    "Tone around Apple remains calm product and tape commentary.";

  function linkingHarness() {
    const researchStore = new InMemoryResearchSurfaceStore([]);
    const catalog = new InMemoryInstrumentCatalog(SEED_INSTRUMENTS);
    const queue = new InMemoryJobQueue();
    const ai = new FakeAiPort({
      scoresByTitleAndTicker: {
        "Apple expands services revenue|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_SERVICES_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_SERVICES_SENTIMENT_RATIONALE,
        },
        "Services mix lifts Apple as hardware stays steady|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_SERVICES_MIX_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_SERVICES_MIX_SENTIMENT_RATIONALE,
        },
        "Apple unveils new device lineup for the holiday quarter|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_DEVICE_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_DEVICE_SENTIMENT_RATIONALE,
        },
        "U.S. stocks climb as soft inflation lifts major indexes|SPY": {
          bias: "bullish",
          biasRationale: EXPECTED_SPY_MACRO_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_SPY_MACRO_SENTIMENT_RATIONALE,
        },
        "U.S. stocks climb as soft inflation lifts major indexes|QQQ": {
          bias: "bullish",
          biasRationale: EXPECTED_QQQ_MACRO_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_QQQ_MACRO_SENTIMENT_RATIONALE,
        },
        "Markets firm while Apple leads large-cap gains|SPY": {
          bias: "bullish",
          biasRationale: EXPECTED_SPY_MACRO_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_SPY_MACRO_SENTIMENT_RATIONALE,
        },
        "Markets firm while Apple leads large-cap gains|QQQ": {
          bias: "bullish",
          biasRationale: EXPECTED_QQQ_MACRO_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_QQQ_MACRO_SENTIMENT_RATIONALE,
        },
        "Markets firm while Apple leads large-cap gains|AAPL": {
          bias: "bullish",
          biasRationale: EXPECTED_AAPL_MACRO_LEAD_BIAS_RATIONALE,
          sentiment: "calm",
          sentimentRationale: EXPECTED_AAPL_MACRO_LEAD_SENTIMENT_RATIONALE,
        },
        "Antitrust officials examine tech partnership terms|AAPL": {
          bias: "bearish",
          biasRationale:
            "For Apple, coverage stresses scrutiny risk and possible deal friction.",
          sentiment: "alarmist",
          sentimentRationale:
            "Language around enforcement and delays is elevated for Apple.",
        },
        "Antitrust officials examine tech partnership terms|MSFT": {
          bias: "neutral",
          biasRationale:
            "For Microsoft, pieces treat the talks as procedural with limited franchise impact.",
          sentiment: "calm",
          sentimentRationale:
            "Microsoft-framed passages stay measured and process-oriented.",
        },
        "Suppliers note steady component orders for phones|AAPL": {
          bias: "bullish",
          biasRationale:
            "Supplier order commentary implies steady unit expectations for Apple.",
          sentiment: "neutral",
          sentimentRationale:
            "Operational supply-chain language without strong emotional framing.",
        },
        "Cloud demand outlook stays mixed into next quarter|MSFT": {
          bias: "neutral",
          biasRationale:
            "Pieces treat cloud demand commentary as balanced for Microsoft with limited franchise tilt.",
          sentiment: "calm",
          sentimentRationale:
            "Language around Microsoft cloud is process-oriented and calm.",
        },
      },
    });

    registerPipelineWorkers({
      queue,
      ai,
      catalog,
      researchWriter: researchStore,
      batchStore: new InMemoryPipelineBatchStore(),
    });

    return { researchStore, catalog, queue };
  }

  async function runFixturePipeline(
    queue: InMemoryJobQueue,
    asOf: Date = AS_OF,
  ): Promise<void> {
    await enqueueFixtureIngest(queue, buildPipelineFixtureFeed(asOf));
    await queue.drain();
  }

  it("links Articles via NLP entity names when explicit tickers are missing", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    if (aapl.status !== "ok") return;

    expect(
      aapl.stories.some((s) =>
        s.articles.some(
          (a) =>
            a.title ===
            "Apple unveils new device lineup for the holiday quarter",
        ),
      ),
    ).toBe(true);

    const device = aapl.stories
      .flatMap((s) => s.articles)
      .find(
        (a) =>
          a.title === "Apple unveils new device lineup for the holiday quarter",
      );
    expect(device?.bias.label).toBe("bullish");
    expect(device?.bias.rationale).toBe(EXPECTED_AAPL_DEVICE_BIAS_RATIONALE);
  });

  it("attaches market-wide Articles to major index ETFs, not every equity", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const spy = await getInstrumentResearch(
      session,
      "SPY",
      emptyResearchDeps({ researchStore }),
    );
    const qqq = await getInstrumentResearch(
      session,
      "QQQ",
      emptyResearchDeps({ researchStore }),
    );
    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );
    const nvda = await getInstrumentResearch(
      session,
      "NVDA",
      emptyResearchDeps({ researchStore }),
    );

    expect(spy.status).toBe("ok");
    expect(qqq.status).toBe("ok");
    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    expect(nvda.status).toBe("ok");
    if (
      spy.status !== "ok" ||
      qqq.status !== "ok" ||
      aapl.status !== "ok" ||
      msft.status !== "ok" ||
      nvda.status !== "ok"
    ) {
      return;
    }

    const macroTitle =
      "U.S. stocks climb as soft inflation lifts major indexes";

    expect(
      spy.stories.some((s) => s.articles.some((a) => a.title === macroTitle)),
    ).toBe(true);
    expect(
      qqq.stories.some((s) => s.articles.some((a) => a.title === macroTitle)),
    ).toBe(true);

    // Market-wide piece must not auto-link single-name equities.
    expect(
      aapl.stories.some((s) => s.articles.some((a) => a.title === macroTitle)),
    ).toBe(false);
    expect(
      msft.stories.some((s) => s.articles.some((a) => a.title === macroTitle)),
    ).toBe(false);
    expect(
      nvda.stories.some((s) => s.articles.some((a) => a.title === macroTitle)),
    ).toBe(false);

    const spyMacro = spy.stories
      .flatMap((s) => s.articles)
      .find((a) => a.title === macroTitle);
    expect(spyMacro?.bias.label).toBe("bullish");
    expect(spyMacro?.bias.rationale).toBe(EXPECTED_SPY_MACRO_BIAS_RATIONALE);
  });

  it("still links explicitly named Instruments on macro pieces", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const spy = await getInstrumentResearch(
      session,
      "SPY",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    expect(spy.status).toBe("ok");
    if (aapl.status !== "ok" || spy.status !== "ok") return;

    const title = "Markets firm while Apple leads large-cap gains";

    expect(
      aapl.stories.some((s) => s.articles.some((a) => a.title === title)),
    ).toBe(true);
    expect(
      spy.stories.some((s) => s.articles.some((a) => a.title === title)),
    ).toBe(true);

    const aaplArticle = aapl.stories
      .flatMap((s) => s.articles)
      .find((a) => a.title === title);
    expect(aaplArticle?.bias.label).toBe("bullish");
    expect(aaplArticle?.bias.rationale).toBe(
      EXPECTED_AAPL_MACRO_LEAD_BIAS_RATIONALE,
    );
  });

  it("does not flood equities from sector-wide coverage without named Instruments", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const sectorTitle =
      "Technology stocks rally on AI optimism across the sector";

    for (const ticker of ["AAPL", "MSFT", "NVDA", "SPY", "QQQ"] as const) {
      const view = await getInstrumentResearch(
        session,
        ticker,
        emptyResearchDeps({ researchStore }),
      );
      expect(view.status).toBe("ok");
      if (view.status !== "ok") return;
      expect(
        view.stories.some((s) =>
          s.articles.some((a) => a.title === sectorTitle),
        ),
      ).toBe(false);
    }
  });

  it("clusters related Articles into a multi-Article Story with consistent rollups", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    if (aapl.status !== "ok") return;

    const servicesStory = aapl.stories.find(
      (s) =>
        s.articles.some((a) => a.title === "Apple expands services revenue") &&
        s.articles.some(
          (a) => a.title === "Services mix lifts Apple as hardware stays steady",
        ),
    );

    expect(servicesStory).toBeDefined();
    expect(servicesStory?.articles.length).toBeGreaterThanOrEqual(2);

    const primary = servicesStory?.articles.find(
      (a) => a.title === "Apple expands services revenue",
    );
    const secondary = servicesStory?.articles.find(
      (a) => a.title === "Services mix lifts Apple as hardware stays steady",
    );

    expect(primary?.bias.label).toBe("bullish");
    expect(primary?.bias.rationale).toBe(EXPECTED_AAPL_SERVICES_BIAS_RATIONALE);
    expect(secondary?.bias.label).toBe("bullish");
    expect(secondary?.bias.rationale).toBe(
      EXPECTED_AAPL_SERVICES_MIX_BIAS_RATIONALE,
    );

    // Story × Instrument rollup stays consistent with underlying Article scores.
    expect(servicesStory?.bias.label).toBe("bullish");
    expect(servicesStory?.sentiment.label).toBe("calm");
    expect([
      EXPECTED_AAPL_SERVICES_BIAS_RATIONALE,
      EXPECTED_AAPL_SERVICES_MIX_BIAS_RATIONALE,
    ]).toContain(servicesStory?.bias.rationale);
  });

  it("surfaces the same multi-Instrument Story on each related Instrument View", async () => {
    const { researchStore, queue } = linkingHarness();

    await runFixturePipeline(queue);

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const msft = await getInstrumentResearch(
      session,
      "MSFT",
      emptyResearchDeps({ researchStore }),
    );

    expect(aapl.status).toBe("ok");
    expect(msft.status).toBe("ok");
    if (aapl.status !== "ok" || msft.status !== "ok") return;

    const title = "Antitrust officials examine tech partnership terms";
    const aaplStory = aapl.stories.find((s) =>
      s.articles.some((a) => a.title === title),
    );
    const msftStory = msft.stories.find((s) =>
      s.articles.some((a) => a.title === title),
    );

    expect(aaplStory?.id).toBe(msftStory?.id);
    expect(aaplStory?.bias.label).toBe("bearish");
    expect(msftStory?.bias.label).toBe("neutral");
  });

  it("keeps unlinked Articles off Dashboard, Watchlist home, and Instrument View", async () => {
    const { researchStore, queue, catalog } = linkingHarness();
    const personal = new InMemoryPersonalSurfaceStore();

    await runFixturePipeline(queue);
    await addInstrumentToWatchlist(session, personal, catalog, "AAPL");
    await addInstrumentToWatchlist(session, personal, catalog, "SPY");

    const forbiddenTitles = [
      "Column without any Instrument markers or metadata",
      "Weekend weather may slow travel plans",
      "Technology stocks rally on AI optimism across the sector",
    ];

    const aapl = await getInstrumentResearch(
      session,
      "AAPL",
      emptyResearchDeps({ researchStore }),
    );
    const spy = await getInstrumentResearch(
      session,
      "SPY",
      emptyResearchDeps({ researchStore }),
    );
    const home = await getWatchlistHome(
      session,
      homeDeps(personal, researchStore),
    );

    expect(aapl.status).toBe("ok");
    expect(spy.status).toBe("ok");
    expect(home.status).toBe("ok");
    if (aapl.status !== "ok" || spy.status !== "ok" || home.status !== "ok") {
      return;
    }

    const instrumentTitles = [...aapl.stories, ...spy.stories].flatMap((s) =>
      s.articles.map((a) => a.title),
    );
    const homeTitles = home.stories.map((s) => s.title);

    for (const title of forbiddenTitles) {
      expect(instrumentTitles).not.toContain(title);
      expect(homeTitles).not.toContain(title);
    }
  });
});
