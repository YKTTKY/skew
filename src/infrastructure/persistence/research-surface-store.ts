import type { ResearchSurfaceStore } from "@/modules/dashboard/research-surface";
import { InMemoryResearchSurfaceStore } from "@/infrastructure/persistence/in-memory-research-surface";
import type { PipelineResearchWriter } from "@/modules/pipeline/research-writer";

/**
 * Composition root for Instrument View research data.
 *
 * Default constructor still loads the relative seed corpus so existing
 * Instrument View / Watchlist demos work offline. The same singleton also
 * implements PipelineResearchWriter: when a worker (or test) publishes
 * pipeline Stories into this store, they appear on the read path without a
 * separate manual seed step.
 *
 * Cross-process durability (web vs worker) requires a Postgres-backed
 * research writer and queue (ADR 0002 / 0005) — in-memory is process-local.
 */
const store = new InMemoryResearchSurfaceStore();

export function getResearchSurfaceStore(): ResearchSurfaceStore {
  return store;
}

/** Same singleton for pipeline publish — keeps jobs off the HTTP request path. */
export function getPipelineResearchWriter(): PipelineResearchWriter {
  return store;
}
