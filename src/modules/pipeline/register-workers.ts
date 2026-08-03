import type { InstrumentCatalog } from "@/modules/dashboard/instrument-catalog";
import type { AiPort } from "@/modules/pipeline/ai-port";
import type { PipelineBatchStore } from "@/modules/pipeline/batch-store";
import type { EnqueueFixturePayload } from "@/modules/pipeline/enqueue-fixture";
import type { JobQueue } from "@/modules/pipeline/job-queue";
import type { PipelineResearchWriter } from "@/modules/pipeline/research-writer";
import { clusterArticles } from "@/modules/pipeline/stages/cluster";
import { embedArticles } from "@/modules/pipeline/stages/embed";
import { ingestFeedItems } from "@/modules/pipeline/stages/ingest";
import { linkArticlesToInstruments } from "@/modules/pipeline/stages/link";
import { scoreAndPublish } from "@/modules/pipeline/stages/score";

export type RegisterPipelineWorkersDeps = {
  queue: JobQueue;
  ai: AiPort;
  catalog: InstrumentCatalog;
  researchWriter: PipelineResearchWriter;
  /** Required working-set store for multi-stage batches (inject in-memory or Postgres adapter). */
  batchStore: PipelineBatchStore;
};

/**
 * Register ingest → embed → link → cluster → score handlers on the job queue.
 * Each stage enqueues the next so long-running AI work stays off the Dashboard path.
 */
export function registerPipelineWorkers(
  deps: RegisterPipelineWorkersDeps,
): void {
  const { queue, ai, catalog, researchWriter, batchStore } = deps;

  queue.register("pipeline.ingest", async (payload) => {
    const { batchId, feedItems } = payload as EnqueueFixturePayload;
    const batch = ingestFeedItems(batchId, feedItems);
    await batchStore.save(batch);
    await queue.enqueue("pipeline.embed", { batchId });
  });

  queue.register("pipeline.embed", async (payload) => {
    const { batchId } = payload as { batchId: string };
    const existing = await requireBatch(batchStore, batchId);
    const batch = await embedArticles(existing, ai);
    await batchStore.save(batch);
    await queue.enqueue("pipeline.link", { batchId });
  });

  queue.register("pipeline.link", async (payload) => {
    const { batchId } = payload as { batchId: string };
    const existing = await requireBatch(batchStore, batchId);
    const batch = await linkArticlesToInstruments(existing, catalog);
    await batchStore.save(batch);
    await queue.enqueue("pipeline.cluster", { batchId });
  });

  queue.register("pipeline.cluster", async (payload) => {
    const { batchId } = payload as { batchId: string };
    const existing = await requireBatch(batchStore, batchId);
    const batch = clusterArticles(existing);
    await batchStore.save(batch);
    await queue.enqueue("pipeline.score", { batchId });
  });

  queue.register("pipeline.score", async (payload) => {
    const { batchId } = payload as { batchId: string };
    const existing = await requireBatch(batchStore, batchId);
    const batch = await scoreAndPublish(existing, ai, researchWriter);
    await batchStore.save(batch);
  });
}

async function requireBatch(
  batchStore: PipelineBatchStore,
  batchId: string,
) {
  const batch = await batchStore.get(batchId);
  if (!batch) {
    throw new Error(`Pipeline batch not found: ${batchId}`);
  }
  return batch;
}
