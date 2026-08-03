import type {
  DrainableJobQueue,
  JobHandler,
  PipelineJobName,
} from "@/modules/pipeline/job-queue";

type QueuedJob = {
  name: PipelineJobName;
  payload: unknown;
};

/**
 * In-memory job queue for tests and local development.
 * Models the Postgres-backed queue port (ADR 0005) without a DB dependency.
 * Production swaps in pg-boss (or equivalent) behind the JobQueue interface.
 * Implements DrainableJobQueue for in-process drain (not a production poller).
 */
export class InMemoryJobQueue implements DrainableJobQueue {
  private readonly handlers = new Map<PipelineJobName, JobHandler>();
  private readonly pending: QueuedJob[] = [];
  private draining = false;

  register(name: PipelineJobName, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async enqueue(name: PipelineJobName, payload: unknown): Promise<void> {
    this.pending.push({ name, payload });
  }

  /** Process until idle. Handlers may enqueue follow-on stages. */
  async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      while (this.pending.length > 0) {
        const job = this.pending.shift()!;
        const handler = this.handlers.get(job.name);
        if (!handler) {
          throw new Error(`No handler registered for job ${job.name}`);
        }
        await handler(job.payload);
      }
    } finally {
      this.draining = false;
    }
  }

  /** Pending job count — useful for asserting async enqueue without drain. */
  get pendingCount(): number {
    return this.pending.length;
  }
}
