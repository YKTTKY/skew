/**
 * Worker entrypoint for the thin news analysis pipeline.
 * Deploy separately from the Next.js web process (ADR 0001).
 *
 * Usage (local):
 *   npx tsx src/workers/pipeline-worker.ts
 *
 * Stages: ingest → embed → link → cluster → score (JobQueue port;
 * in-memory adapter until Supabase/pg-boss is wired — ADR 0005).
 *
 * Note: with the in-memory research store, this process only mutates its own
 * singleton. Shared durability with the Dashboard requires a Postgres-backed
 * research writer (same as the eventual pg-boss queue).
 */

import { FakeAiPort } from "@/infrastructure/ai/fake-ai-port";
import { NimAiPort } from "@/infrastructure/ai/nim-ai-port";
import { InMemoryInstrumentCatalog } from "@/infrastructure/persistence/in-memory-instrument-catalog";
import {
  getPipelineResearchWriter,
  getResearchSurfaceStore,
} from "@/infrastructure/persistence/research-surface-store";
import { SEED_US_INSTRUMENTS } from "@/infrastructure/persistence/seed-instruments";
import { InMemoryPipelineBatchStore } from "@/infrastructure/pipeline/in-memory-batch-store";
import { buildPipelineFixtureFeed } from "@/infrastructure/pipeline/fixture-sources";
import { InMemoryJobQueue } from "@/infrastructure/queue/in-memory-job-queue";
import type { AiPort } from "@/modules/pipeline/ai-port";
import { enqueueFixtureIngest } from "@/modules/pipeline/enqueue-fixture";
import { registerPipelineWorkers } from "@/modules/pipeline/register-workers";

async function main(): Promise<void> {
  const researchWriter = getPipelineResearchWriter();
  const researchStore = getResearchSurfaceStore();
  const catalog = new InMemoryInstrumentCatalog(SEED_US_INSTRUMENTS);
  const queue = new InMemoryJobQueue();
  const batchStore = new InMemoryPipelineBatchStore();
  const ai = createAiPort();

  registerPipelineWorkers({
    queue,
    ai,
    catalog,
    researchWriter,
    batchStore,
  });

  const feed = buildPipelineFixtureFeed(new Date());
  const { batchId } = await enqueueFixtureIngest(queue, feed);
  console.log(`Enqueued fixture ingest batch ${batchId} (${feed.length} items)`);

  await queue.drain();

  const sample = await researchStore.listStoriesForInstrument({
    ticker: "AAPL",
    asOf: new Date(),
    windowDays: 90,
  });
  console.log(
    `Pipeline complete. AAPL Stories in Research Window: ${sample.length}`,
  );
  for (const story of sample) {
    console.log(
      `  - ${story.title} [${story.bias.label}/${story.sentiment.label}] articles=${story.articles.length}`,
    );
  }
}

function createAiPort(): AiPort {
  const apiKey = process.env.NIM_API_KEY ?? "";
  const baseUrl =
    process.env.NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  if (apiKey) {
    console.log("Using NimAiPort (NVIDIA NIM development adapter)");
    return new NimAiPort({ baseUrl, apiKey });
  }
  console.log("NIM_API_KEY unset — using FakeAiPort for local fixture run");
  return new FakeAiPort();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
