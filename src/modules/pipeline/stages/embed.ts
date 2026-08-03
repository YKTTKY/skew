import type { AiPort } from "@/modules/pipeline/ai-port";
import type { PipelineBatch } from "@/modules/pipeline/types";

/** Attach embeddings to each Article for clustering. */
export async function embedArticles(
  batch: PipelineBatch,
  ai: AiPort,
): Promise<PipelineBatch> {
  const articles = [];
  for (const article of batch.articles) {
    const text = `${article.title}\n${article.body}`;
    const embedding = await ai.embed({ text });
    articles.push({ ...article, embedding });
  }
  return { ...batch, articles };
}
