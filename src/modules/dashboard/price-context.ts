/**
 * Price Context port for Instrument View orientation.
 * Last price + simple chart series — not a charting or TA workstation.
 * Adapters (fake, later market-data vendor) implement PriceContextProvider.
 */

/** One sample on the lightweight orientation chart. */
export type PriceContextPoint = {
  /** ISO-8601 timestamp for the sample. */
  at: string;
  price: number;
};

/** Lightweight last price and chart series for Pre-Trade Research orientation. */
export type PriceContext = {
  lastPrice: number;
  currency: string;
  /** When the last price was observed (ISO-8601). */
  asOf: string;
  /** Chronological samples for a simple orientation chart. */
  series: PriceContextPoint[];
};

/** Trader-visible Price Context on Instrument View (available or degraded). */
export type InstrumentPriceContext =
  | ({ status: "available" } & PriceContext)
  | { status: "unavailable" };

/**
 * Lightweight market-data adapter for Instrument View Price Context.
 * Failures must degrade gracefully — never block Stories or scores.
 */
export type PriceContextProvider = {
  getPriceContext(input: { ticker: string }): Promise<InstrumentPriceContext>;
};
