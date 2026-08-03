import type {
  InstrumentCatalog,
  InstrumentRecord,
} from "@/modules/dashboard/instrument-catalog";

/**
 * In-memory Instrument catalog for tests and local development.
 * Tickers are normalized to uppercase; search is case-insensitive prefix match.
 */
export class InMemoryInstrumentCatalog implements InstrumentCatalog {
  private readonly byTicker = new Map<string, InstrumentRecord>();

  constructor(instruments: InstrumentRecord[] = []) {
    for (const instrument of instruments) {
      const ticker = instrument.ticker.trim().toUpperCase();
      this.byTicker.set(ticker, {
        ...instrument,
        ticker,
      });
    }
  }

  async findByTicker(ticker: string): Promise<InstrumentRecord | null> {
    const key = ticker.trim().toUpperCase();
    return this.byTicker.get(key) ?? null;
  }

  async searchByTickerPrefix(
    query: string,
    limit = 20,
  ): Promise<InstrumentRecord[]> {
    const prefix = query.trim().toUpperCase();
    if (!prefix) {
      return [];
    }

    const matches: InstrumentRecord[] = [];
    for (const instrument of this.byTicker.values()) {
      if (instrument.ticker.startsWith(prefix)) {
        matches.push(instrument);
        if (matches.length >= limit) {
          break;
        }
      }
    }
    return matches;
  }

  async listAll(): Promise<InstrumentRecord[]> {
    return [...this.byTicker.values()].sort((a, b) =>
      a.ticker.localeCompare(b.ticker),
    );
  }
}
