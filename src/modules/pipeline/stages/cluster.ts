import type { PipelineArticle, PipelineBatch, PipelineStory } from "@/modules/pipeline/types";

/**
 * Cosine similarity threshold for Story clustering.
 * Embeddings are the primary signal (ADR / product: related coverage, not
 * only near-duplicates — syndication already collapsed at ingest).
 */
const SIMILARITY_THRESHOLD = 0.68;

/**
 * Cluster related Articles into Stories via embedding similarity.
 * Unlinked Articles still get Stories in the batch but never publish to trader surfaces.
 */
export function clusterArticles(batch: PipelineBatch): PipelineBatch {
  const clusters: PipelineArticle[][] = [];

  for (const article of batch.articles) {
    let placed = false;
    let bestCluster: PipelineArticle[] | null = null;
    let bestSimilarity = SIMILARITY_THRESHOLD;

    for (const cluster of clusters) {
      // Best match to any member keeps multi-Article Stories coherent as they grow.
      const similarity = maxSimilarityToCluster(article, cluster);
      if (similarity >= bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
        placed = true;
      }
    }

    if (placed && bestCluster) {
      bestCluster.push(article);
    } else {
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

function maxSimilarityToCluster(
  article: PipelineArticle,
  cluster: PipelineArticle[],
): number {
  if (!article.embedding) {
    return 0;
  }
  let best = 0;
  for (const member of cluster) {
    if (!member.embedding) {
      continue;
    }
    const sim = cosineSimilarity(article.embedding, member.embedding);
    if (sim > best) {
      best = sim;
    }
  }
  return best;
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
