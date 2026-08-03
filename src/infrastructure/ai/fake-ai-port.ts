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
 * Deterministic bag-of-tokens embedding so related coverage clusters and
 * unrelated titles stay apart. Title tokens are weighted higher so Story
 * clustering (embeddings-primary) groups same-event pieces without needing
 * near-duplicate bodies.
 */
function defaultEmbeddingFromText(text: string): number[] {
  const newline = text.indexOf("\n");
  const title = newline >= 0 ? text.slice(0, newline) : text;
  const body = newline >= 0 ? text.slice(newline + 1) : "";

  const dims = 64;
  const vec = new Array<number>(dims).fill(0);
  accumulateTokens(vec, normalizeTokens(title), 3);
  accumulateTokens(vec, normalizeTokens(body), 1);

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function accumulateTokens(
  vec: number[],
  tokens: string[],
  weight: number,
): void {
  const dims = vec.length;
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[(h >>> 0) % dims] += weight;
    // Second hash reduces collisions for short bags of tokens.
    let h2 = 0;
    for (let i = 0; i < token.length; i++) {
      h2 = (h2 * 33 + token.charCodeAt(i)) >>> 0;
    }
    vec[h2 % dims] += weight * 0.5;
  }
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}
