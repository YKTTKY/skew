import type { PipelineBatch } from "@/modules/pipeline/types";
import type { PipelineBatchStore } from "@/modules/pipeline/batch-store";

/**
 * In-memory working-set storage for pipeline batches across async stages.
 * Production may use Postgres rows behind the same PipelineBatchStore port.
 */
export class InMemoryPipelineBatchStore implements PipelineBatchStore {
  private readonly batches = new Map<string, PipelineBatch>();

  async save(batch: PipelineBatch): Promise<void> {
    this.batches.set(batch.batchId, cloneBatch(batch));
  }

  async get(batchId: string): Promise<PipelineBatch | null> {
    const batch = this.batches.get(batchId);
    return batch ? cloneBatch(batch) : null;
  }
}

function cloneBatch(batch: PipelineBatch): PipelineBatch {
  return {
    batchId: batch.batchId,
    feedItems: batch.feedItems.map((item) => ({
      ...item,
      metadataTickers: item.metadataTickers
        ? [...item.metadataTickers]
        : undefined,
    })),
    articles: batch.articles.map((article) => ({
      ...article,
      sources: [...article.sources],
      metadataTickers: [...article.metadataTickers],
      embedding: article.embedding ? [...article.embedding] : undefined,
      instrumentLinks: [...article.instrumentLinks],
      scoresByTicker: { ...article.scoresByTicker },
    })),
    stories: batch.stories.map((story) => ({
      ...story,
      articleIds: [...story.articleIds],
      rollupByTicker: { ...story.rollupByTicker },
    })),
  };
}
