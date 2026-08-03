import type { PriceContext } from "@/modules/dashboard/price-context";
import { SEED_AS_OF_ISO } from "@/infrastructure/persistence/seed-research";

/**
 * Deterministic Price Context seed for demos and primary-seam tests.
 * Series is a short orientation path — not market-accurate quotes.
 */

function daysBefore(asOf: Date, days: number): string {
  const d = new Date(asOf.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function buildSeries(
  asOf: Date,
  points: Array<{ daysAgo: number; price: number }>,
): PriceContext["series"] {
  return points
    .slice()
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .map((p) => ({
      at: daysBefore(asOf, p.daysAgo),
      price: p.price,
    }));
}

function quote(
  asOf: Date,
  lastPrice: number,
  series: Array<{ daysAgo: number; price: number }>,
  currency = "USD",
): PriceContext {
  const ordered = buildSeries(asOf, series);
  return {
    lastPrice,
    currency,
    asOf: asOf.toISOString(),
    series: ordered,
  };
}

/**
 * Seeded quotes for known demo Instruments.
 * Timestamps are relative to `asOf` so tests can pin a clock.
 */
export function buildSeedPriceContextQuotes(
  asOf: Date = new Date(SEED_AS_OF_ISO),
): Record<string, PriceContext> {
  return {
    AAPL: quote(asOf, 214.5, [
      { daysAgo: 6, price: 208.2 },
      { daysAgo: 5, price: 209.8 },
      { daysAgo: 4, price: 211.1 },
      { daysAgo: 3, price: 210.4 },
      { daysAgo: 2, price: 212.7 },
      { daysAgo: 1, price: 213.9 },
      { daysAgo: 0, price: 214.5 },
    ]),
    MSFT: quote(asOf, 428.1, [
      { daysAgo: 6, price: 421.0 },
      { daysAgo: 5, price: 422.5 },
      { daysAgo: 4, price: 424.2 },
      { daysAgo: 3, price: 425.0 },
      { daysAgo: 2, price: 426.8 },
      { daysAgo: 1, price: 427.4 },
      { daysAgo: 0, price: 428.1 },
    ]),
    SPY: quote(asOf, 548.2, [
      { daysAgo: 6, price: 541.0 },
      { daysAgo: 5, price: 542.3 },
      { daysAgo: 4, price: 543.8 },
      { daysAgo: 3, price: 545.1 },
      { daysAgo: 2, price: 546.0 },
      { daysAgo: 1, price: 547.4 },
      { daysAgo: 0, price: 548.2 },
    ]),
  };
}
