/**
 * Postgres-backed job queue port for the news analysis pipeline (ADR 0005).
 * Adapters: in-memory for tests/local; pg-boss (or equivalent) in production.
 * Callers assert durable outcomes after jobs run — not queue row formats.
 *
 * Production workers poll continuously. Test/local drains use DrainableJobQueue.
 */

export type PipelineJobName =
  | "pipeline.ingest"
  | "pipeline.embed"
  | "pipeline.link"
  | "pipeline.cluster"
  | "pipeline.score";

export type JobHandler = (payload: unknown) => Promise<void>;

export type JobQueue = {
  register(name: PipelineJobName, handler: JobHandler): void;
  enqueue(name: PipelineJobName, payload: unknown): Promise<void>;
};

/**
 * Optional drain for in-process test/local adapters.
 * Not part of the production Postgres poller contract.
 */
export type DrainableJobQueue = JobQueue & {
  /** Process queued work until idle. Handlers may enqueue follow-on stages. */
  drain(): Promise<void>;
};
