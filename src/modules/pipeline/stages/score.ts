import type { AiPort, ArticleInstrumentScore } from "@/modules/pipeline/ai-port";
import type { PipelineResearchWriter } from "@/modules/pipeline/research-writer";
import type {
  PipelineArticle,
  PipelineBatch,
  PipelineStory,
} from "@/modules/pipeline/types";

/**
 * Score each linked Article × Instrument via the AI port, roll up to
 * Story × Instrument, and publish only Stories that still have linked Articles.
 * Unlinked Articles never reach the research writer / trader-facing surfaces.
 */
export async function scoreAndPublish(
  batch: PipelineBatch,
  ai: AiPort,
  researchWriter: PipelineResearchWriter,
): Promise<PipelineBatch> {
  const scoredArticles: PipelineArticle[] = [];

  for (const article of batch.articles) {
    const scoresByTicker: Record<string, ArticleInstrumentScore> = {};
    for (const ticker of article.instrumentLinks) {
      scoresByTicker[ticker] = await ai.scoreArticleForInstrument({
        articleTitle: article.title,
        articleBody: article.body,
        ticker,
      });
    }
    scoredArticles.push({ ...article, scoresByTicker });
  }

  const articleById = new Map(scoredArticles.map((a) => [a.id, a]));
  const scoredStories: PipelineStory[] = batch.stories.map((story) => {
    const articles = story.articleIds
      .map((id) => articleById.get(id))
      .filter((a): a is PipelineArticle => a !== undefined);

    const tickers = new Set<string>();
    for (const article of articles) {
      for (const ticker of article.instrumentLinks) {
        tickers.add(ticker);
      }
    }

    const rollupByTicker: Record<string, ArticleInstrumentScore> = {};
    for (const ticker of tickers) {
      const pairScores = articles
        .map((a) => a.scoresByTicker[ticker])
        .filter((s): s is ArticleInstrumentScore => s !== undefined);
      if (pairScores.length === 0) {
        continue;
      }
      rollupByTicker[ticker] = rollupScores(pairScores);
    }

    return { ...story, rollupByTicker };
  });

  const publishable = scoredStories
    .map((story) => {
      const articles = story.articleIds
        .map((id) => articleById.get(id))
        .filter((a): a is PipelineArticle => a !== undefined)
        .filter((a) => a.instrumentLinks.length > 0)
        .map((a) => ({
          id: a.id,
          title: a.title,
          sources: [...a.sources],
          publishedAt: a.publishedAt,
          instrumentLinks: [...a.instrumentLinks],
          scoresByTicker: { ...a.scoresByTicker },
        }));

      if (articles.length === 0) {
        return null;
      }

      // Only keep rollups for Instruments that still have Article scores.
      const rollupByTicker: Record<string, ArticleInstrumentScore> = {};
      for (const [ticker, score] of Object.entries(story.rollupByTicker)) {
        if (articles.some((a) => a.instrumentLinks.includes(ticker))) {
          rollupByTicker[ticker] = score;
        }
      }

      if (Object.keys(rollupByTicker).length === 0) {
        return null;
      }

      return {
        id: story.id,
        title: story.title,
        updatedAt: story.updatedAt,
        articles,
        rollupByTicker,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  await researchWriter.publishStories(publishable);

  return {
    ...batch,
    articles: scoredArticles,
    stories: scoredStories,
  };
}

/** Majority label rollup; first Rationale when labels tie by count order. */
function rollupScores(
  scores: ArticleInstrumentScore[],
): ArticleInstrumentScore {
  if (scores.length === 1) {
    return { ...scores[0]! };
  }

  const bias = majority(
    scores.map((s) => s.bias),
    ["bullish", "bearish", "neutral"],
  );
  const sentiment = majority(
    scores.map((s) => s.sentiment),
    ["calm", "alarmist", "neutral"],
  );

  const biasSource =
    scores.find((s) => s.bias === bias) ?? scores[0]!;
  const sentimentSource =
    scores.find((s) => s.sentiment === sentiment) ?? scores[0]!;

  return {
    bias,
    biasRationale: biasSource.biasRationale,
    sentiment,
    sentimentRationale: sentimentSource.sentimentRationale,
  };
}

function majority<T extends string>(
  values: T[],
  preferenceOrder: T[],
): T {
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = values[0]!;
  let bestCount = -1;
  for (const candidate of preferenceOrder) {
    const count = counts.get(candidate) ?? 0;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  // If preference order missed a value, fall back to max count.
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
