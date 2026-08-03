import type { InstrumentCatalog } from "@/modules/dashboard/instrument-catalog";
import { InMemoryInstrumentCatalog } from "@/infrastructure/persistence/in-memory-instrument-catalog";
import { SEED_US_INSTRUMENTS } from "@/infrastructure/persistence/seed-instruments";

/**
 * Composition root for the Instrument catalog used by Watchlist search/add.
 * Seeded known US equities and ETFs until a market-data-backed catalog exists.
 */
const catalog: InstrumentCatalog = new InMemoryInstrumentCatalog(
  SEED_US_INSTRUMENTS,
);

export function getInstrumentCatalog(): InstrumentCatalog {
  return catalog;
}
