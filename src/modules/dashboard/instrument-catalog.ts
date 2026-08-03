/**
 * Known US equity/ETF Instruments a Retail Trader can search and add to a Watchlist.
 */
export type InstrumentKind = "equity" | "etf";

export type InstrumentRecord = {
  ticker: string;
  name: string;
  kind: InstrumentKind;
};

export type InstrumentCatalog = {
  findByTicker(ticker: string): Promise<InstrumentRecord | null>;
  searchByTickerPrefix(
    query: string,
    limit?: number,
  ): Promise<InstrumentRecord[]>;
  /** Full known universe — used for NLP entity name resolution at link time. */
  listAll(): Promise<InstrumentRecord[]>;
};
