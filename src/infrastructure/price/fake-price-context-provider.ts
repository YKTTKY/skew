import type {
  InstrumentPriceContext,
  PriceContext,
  PriceContextProvider,
} from "@/modules/dashboard/price-context";

/**
 * Fake Price Context provider for tests and demo composition.
 * Deterministic quotes keyed by ticker; missing keys → unavailable.
 */
export class FakePriceContextProvider implements PriceContextProvider {
  private readonly byTicker: Map<string, PriceContext>;

  constructor(quotes: Record<string, PriceContext> = {}) {
    this.byTicker = new Map(
      Object.entries(quotes).map(([ticker, ctx]) => [
        ticker.trim().toUpperCase(),
        ctx,
      ]),
    );
  }

  async getPriceContext(input: {
    ticker: string;
  }): Promise<InstrumentPriceContext> {
    const ctx = this.byTicker.get(input.ticker.trim().toUpperCase());
    if (!ctx) {
      return { status: "unavailable" };
    }
    return { status: "available", ...ctx };
  }
}

/** Always fails — exercises graceful Price Context degradation. */
export class FailingPriceContextProvider implements PriceContextProvider {
  async getPriceContext(): Promise<InstrumentPriceContext> {
    throw new Error("price provider unavailable");
  }
}
