import type { PriceContextProvider } from "@/modules/dashboard/price-context";
import { FakePriceContextProvider } from "@/infrastructure/price/fake-price-context-provider";
import { buildSeedPriceContextQuotes } from "@/infrastructure/price/seed-price-context";

/**
 * Composition root for Instrument View Price Context.
 * Seeded fake quotes until a live market-data adapter is wired.
 */
const provider: PriceContextProvider = new FakePriceContextProvider(
  buildSeedPriceContextQuotes(new Date()),
);

export function getPriceContextProvider(): PriceContextProvider {
  return provider;
}
