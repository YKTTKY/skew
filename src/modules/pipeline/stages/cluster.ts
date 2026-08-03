import type { PipelineArticle, PipelineBatch, PipelineStory } from "@/modules/pipeline/types";

/** Cosine similarity threshold for thin Story clustering. */
const SIMILARITY_THRESHOLD = 0.92;

/**
 * Minimal clustering: group Articles with highly similar embeddings into Stories.
 * Unlinked Articles still get Stories in the batch but never publish to trader surfaces.
 */
export function clusterArticles(batch: PipelineBatch): PipelineBatch {
  const clusters: PipelineArticle[][] = [];

  for (const article of batch.articles) {
    let placed = false;
    for (const cluster of clusters) {
      const seed = cluster[0]!;
      if (
        article.embedding &&
        seed.embedding &&
        cosineSimilarity(article.embedding, seed.embedding) >=
          SIMILARITY_THRESHOLD
      ) {
        cluster.push(article);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push([article]);
    }
  }

  const stories: PipelineStory[] = clusters.map((cluster, index) => {
    const sorted = [...cluster].sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
    const newest = sorted[0]!;
    const oldestTitle = sorted[sorted.length - 1]!.title;
    return {
      id: `story-${batch.batchId}-${index + 1}`,
      title: oldestTitle,
      updatedAt: newest.publishedAt,
      articleIds: sorted.map((a) => a.id),
      rollupByTicker: {},
    };
  });

  return { ...batch, stories };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
