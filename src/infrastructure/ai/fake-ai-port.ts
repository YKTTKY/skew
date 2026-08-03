import type {
  AiPort,
  ArticleInstrumentScore,
} from "@/modules/pipeline/ai-port";

export type FakeAiPortOptions = {
  /**
   * Deterministic scores keyed by `"${title}|${ticker}"`.
   * Missing keys fall back to neutral/calm coverage-only rationales.
   */
  scoresByTitleAndTicker?: Record<string, ArticleInstrumentScore>;
  /** Optional fixed embedding; otherwise derived from text for clustering. */
  embeddingForText?: (text: string) => number[];
};

/**
 * Test double for the AI port. Returns configured scores and deterministic
 * embeddings — no network, no vendor SDK.
 */
export class FakeAiPort implements AiPort {
  private readonly scores: Record<string, ArticleInstrumentScore>;
  private readonly embeddingForText: (text: string) => number[];

  constructor(options: FakeAiPortOptions = {}) {
    this.scores = options.scoresByTitleAndTicker ?? {};
    this.embeddingForText =
      options.embeddingForText ?? defaultEmbeddingFromText;
  }

  async embed(input: { text: string }): Promise<number[]> {
    return this.embeddingForText(input.text);
  }

  async scoreArticleForInstrument(input: {
    articleTitle: string;
    articleBody: string;
    ticker: string;
  }): Promise<ArticleInstrumentScore> {
    const key = `${input.articleTitle}|${input.ticker.trim().toUpperCase()}`;
    const configured = this.scores[key];
    if (configured) {
      return { ...configured };
    }
    return {
      bias: "neutral",
      biasRationale: `Coverage for ${input.ticker.trim().toUpperCase()} is framed without a strong directional tilt.`,
      sentiment: "calm",
      sentimentRationale:
        "Tone is measured reporting language without emotional intensifiers.",
    };
  }
}

/**
 * Deterministic bag-of-tokens embedding so near-identical titles cluster
 * and unrelated titles stay apart — enough for thin clustering tests.
 */
function defaultEmbeddingFromText(text: string): number[] {
  const tokens = normalizeTokens(text);
  const dims = 32;
  const vec = new Array<number>(dims).fill(0);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = (h * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[h % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}
