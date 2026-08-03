import type { ResearchSurfaceStore } from "@/modules/dashboard/research-surface";
import { InMemoryResearchSurfaceStore } from "@/infrastructure/persistence/in-memory-research-surface";

/**
 * Composition root for Instrument View research data.
 * Seeded in-memory corpus until the news pipeline writes durable Postgres rows.
 */
const store: ResearchSurfaceStore = new InMemoryResearchSurfaceStore();

export function getResearchSurfaceStore(): ResearchSurfaceStore {
  return store;
}
