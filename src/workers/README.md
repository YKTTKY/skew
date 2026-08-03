# Workers

Separate entrypoints for long-running pipeline work (ingest → embed → link → cluster → score). Deployed apart from the Next.js web process (ADR 0001).

## Pipeline worker (issues 06–07)

`pipeline-worker.ts` runs the fixture Source path through the job queue:

```bash
npx tsx src/workers/pipeline-worker.ts
```

- **Stages**: ingest → embed → link (explicit + NLP entity + macro index ETFs) → cluster (embeddings) → score.
- **Queue port**: `JobQueue` (in-memory adapter locally; Postgres/pg-boss in production — ADR 0005).
- **AI port**: `FakeAiPort` when `NIM_API_KEY` is unset; `NimAiPort` when set (ADR 0004).
- **Publish path**: `PipelineResearchWriter` (same interface the Dashboard composition root exposes via `getPipelineResearchWriter()`).

Dashboard HTTP never runs these stages. With in-memory stores, web and worker processes do not share rows until a Postgres-backed research writer and queue exist; primary-seam tests assert trader-visible outcomes by sharing one store in-process.
