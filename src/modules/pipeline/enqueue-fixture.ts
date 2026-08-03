import type { JobQueue } from "@/modules/pipeline/job-queue";
import type { SourceFeedItem } from "@/modules/pipeline/types";

export type EnqueueFixturePayload = {
  batchId: string;
  feedItems: SourceFeedItem[];
};

/**
 * Enqueue fixture/curated Source ingest as an async job.
 * Returns after enqueue — does not wait for embed/link/cluster/score.
 */
export async function enqueueFixtureIngest(
  queue: JobQueue,
  feedItems: SourceFeedItem[],
  batchId: string = `batch-${Date.now()}`,
): Promise<{ batchId: string }> {
  await queue.enqueue("pipeline.ingest", {
    batchId,
    feedItems,
  } satisfies EnqueueFixturePayload);
  return { batchId };
}
