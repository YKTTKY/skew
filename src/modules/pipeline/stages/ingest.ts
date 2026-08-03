import type {
  PipelineArticle,
  PipelineBatch,
  SourceFeedItem,
} from "@/modules/pipeline/types";

/**
 * Ingest feed items into Articles with syndication dedupe.
 * Near-identical republishes (same externalId or normalized title+body)
 * collapse to one Article with multiple Source attributions.
 */
export function ingestFeedItems(
  batchId: string,
  feedItems: SourceFeedItem[],
): PipelineBatch {
  const articles: PipelineArticle[] = [];

  for (const item of feedItems) {
    const match = findSyndicationMatch(articles, item);
    if (match) {
      if (!match.sources.includes(item.sourceName)) {
        match.sources.push(item.sourceName);
      }
      for (const ticker of item.metadataTickers ?? []) {
        const upper = ticker.trim().toUpperCase();
        if (upper && !match.metadataTickers.includes(upper)) {
          match.metadataTickers.push(upper);
        }
      }
      continue;
    }

    articles.push({
      id: articleIdFor(item, articles.length),
      title: item.title,
      body: item.body,
      sources: [item.sourceName],
      publishedAt: item.publishedAt,
      externalId: item.externalId,
      metadataTickers: (item.metadataTickers ?? []).map((t) =>
        t.trim().toUpperCase(),
      ),
      instrumentLinks: [],
      scoresByTicker: {},
    });
  }

  return {
    batchId,
    feedItems: [...feedItems],
    articles,
    stories: [],
  };
}

function findSyndicationMatch(
  articles: PipelineArticle[],
  item: SourceFeedItem,
): PipelineArticle | undefined {
  if (item.externalId) {
    const byExternal = articles.find((a) => a.externalId === item.externalId);
    if (byExternal) {
      return byExternal;
    }
  }
  const fingerprint = contentFingerprint(item.title, item.body);
  return articles.find(
    (a) => contentFingerprint(a.title, a.body) === fingerprint,
  );
}

function contentFingerprint(title: string, body: string): string {
  return `${normalize(title)}||${normalize(body)}`;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function articleIdFor(item: SourceFeedItem, index: number): string {
  if (item.externalId) {
    return `article-${slug(item.externalId)}`;
  }
  return `article-${index + 1}-${slug(item.title).slice(0, 40)}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
