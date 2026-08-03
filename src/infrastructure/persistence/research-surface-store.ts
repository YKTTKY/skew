import type { ResearchSurfaceStore } from "@/modules/dashboard/research-surface";
import { InMemoryResearchSurfaceStore } from "@/infrastructure/persistence/in-memory-research-surface";
import { getResearchLiveBus } from "@/infrastructure/realtime/research-live-bus";
import { NotifyingPipelineResearchWriter } from "@/modules/pipeline/notifying-research-writer";
import type { PipelineResearchWriter } from "@/modules/pipeline/research-writer";

/**
 * Composition root for Instrument View research data.
 *
 * Default constructor still loads the relative seed corpus so existing
 * Instrument View / Watchlist demos work offline. Pipeline publish goes
 * through a notifying writer so open Dashboard views get small live events
 * after durable Stories land (ADR 0006).
 *
 * Cross-process durability (web vs worker) requires a Postgres-backed
 * research writer and queue (ADR 0002 / 0005) — in-memory is process-local.
 */
const store = new InMemoryResearchSurfaceStore();
const pipelineWriter: PipelineResearchWriter = new NotifyingPipelineResearchWriter(
  store,
  getResearchLiveBus(),
);

export function getResearchSurfaceStore(): ResearchSurfaceStore {
  return store;
}

/** Notifying writer: durable publish, then small research live invalidations. */
export function getPipelineResearchWriter(): PipelineResearchWriter {
  return pipelineWriter;
}
