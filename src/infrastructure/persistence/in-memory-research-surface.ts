import type {
  InstrumentArticleResearch,
  InstrumentStoryResearch,
  ResearchSurfaceStore,
} from "@/modules/dashboard/research-surface";
import type {
  SeedArticle,
  SeedScore,
  SeedStory,
} from "@/infrastructure/persistence/seed-research";
import { buildSeedResearchStories } from "@/infrastructure/persistence/seed-research";
import type {
  PipelineResearchWriter,
  ResearchWriteStory,
} from "@/modules/pipeline/research-writer";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * In-memory ResearchSurfaceStore for tests and local development.
 * Filters by Research Window and Instrument link; projects scores for one ticker.
 * Default constructor builds relative seed timestamps from wall clock so the
 * Research Window stays populated in local demos.
 * Also implements PipelineResearchWriter so the async pipeline can publish
 * Stories without manual seed.
 */
export class InMemoryResearchSurfaceStore
  implements ResearchSurfaceStore, PipelineResearchWriter
{
  private readonly stories: SeedStory[];

  constructor(stories: SeedStory[] = buildSeedResearchStories(new Date())) {
    this.stories = stories.map(cloneStory);
  }

  /** Test seeder — replace corpus without going through the product API. */
  seedStories(stories: SeedStory[]): void {
    this.stories.splice(0, this.stories.length, ...stories.map(cloneStory));
  }

  /**
   * Pipeline publish path: merge Stories by id (replace on conflict).
   * Unlinked Articles are already filtered by the score stage before publish.
   */
  async publishStories(stories: ResearchWriteStory[]): Promise<void> {
    for (const incoming of stories) {
      const next = toSeedStory(incoming);
      const index = this.stories.findIndex((s) => s.id === next.id);
      if (index >= 0) {
        this.stories[index] = next;
      } else {
        this.stories.push(next);
      }
    }
  }

  async listStoriesForInstrument(input: {
    ticker: string;
    asOf: Date;
    windowDays: number;
  }): Promise<InstrumentStoryResearch[]> {
    const ticker = input.ticker.trim().toUpperCase();
    const windowStart = input.asOf.getTime() - input.windowDays * MS_PER_DAY;

    const result: InstrumentStoryResearch[] = [];

    for (const story of this.stories) {
      const rollup = story.rollupByTicker[ticker];
      if (!rollup) {
        continue;
      }

      const updatedAtMs = Date.parse(story.updatedAt);
      if (Number.isNaN(updatedAtMs) || updatedAtMs < windowStart) {
        continue;
      }

      const articles: InstrumentArticleResearch[] = [];
      for (const article of story.articles) {
        if (!article.instrumentLinks.map((t) => t.toUpperCase()).includes(ticker)) {
          continue;
        }
        const scores = article.scoresByTicker[ticker];
        if (!scores) {
          continue;
        }
        articles.push({
          id: article.id,
          title: article.title,
          sources: [...article.sources],
          publishedAt: article.publishedAt,
          ...projectScores(scores),
        });
      }

      // Story only surfaces when at least one linked Article remains for this Instrument.
      if (articles.length === 0) {
        continue;
      }

      result.push({
        id: story.id,
        title: story.title,
        updatedAt: story.updatedAt,
        ...projectScores(rollup),
        articles,
      });
    }

    // Freshest Stories first for Instrument View scan order.
    result.sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );

    return result;
  }
}

function projectScores(
  scores: SeedScore,
): Pick<InstrumentStoryResearch, "bias" | "sentiment"> {
  return {
    bias: {
      label: scores.bias,
      rationale: scores.biasRationale,
    },
    sentiment: {
      label: scores.sentiment,
      rationale: scores.sentimentRationale,
    },
  };
}

function toSeedStory(story: ResearchWriteStory): SeedStory {
  return cloneStory({
    id: story.id,
    title: story.title,
    updatedAt: story.updatedAt,
    rollupByTicker: mapScores(story.rollupByTicker),
    articles: story.articles.map(
      (article): SeedArticle => ({
        id: article.id,
        title: article.title,
        sources: [...article.sources],
        publishedAt: article.publishedAt,
        instrumentLinks: [...article.instrumentLinks],
        scoresByTicker: mapScores(article.scoresByTicker),
      }),
    ),
  });
}

function mapScores(
  scores: ResearchWriteStory["rollupByTicker"],
): Record<string, SeedScore> {
  const out: Record<string, SeedScore> = {};
  for (const [ticker, score] of Object.entries(scores)) {
    out[ticker] = {
      bias: score.bias,
      biasRationale: score.biasRationale,
      sentiment: score.sentiment,
      sentimentRationale: score.sentimentRationale,
    };
  }
  return out;
}

function cloneStory(story: SeedStory): SeedStory {
  return {
    ...story,
    rollupByTicker: { ...story.rollupByTicker },
    articles: story.articles.map(
      (article): SeedArticle => ({
        ...article,
        sources: [...article.sources],
        instrumentLinks: [...article.instrumentLinks],
        scoresByTicker: { ...article.scoresByTicker },
      }),
    ),
  };
}

/** Store that always fails — exercises Instrument View load-error recovery copy. */
export class FailingResearchSurfaceStore implements ResearchSurfaceStore {
  async listStoriesForInstrument(): Promise<InstrumentStoryResearch[]> {
    throw new Error("simulated research store failure");
  }
}
