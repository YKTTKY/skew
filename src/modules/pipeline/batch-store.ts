import type { PipelineBatch } from "@/modules/pipeline/types";

/**
 * Working-set storage for in-flight pipeline batches across async job stages.
 * Adapters live under infrastructure (in-memory now; Postgres later).
 */
export type PipelineBatchStore = {
  save(batch: PipelineBatch): Promise<void>;
  get(batchId: string): Promise<PipelineBatch | null>;
};
