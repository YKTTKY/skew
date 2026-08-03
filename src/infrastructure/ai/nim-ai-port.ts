import type {
  AiPort,
  ArticleInstrumentScore,
} from "@/modules/pipeline/ai-port";

export type NimAiPortConfig = {
  /** NVIDIA NIM base URL (OpenAI-compatible chat/embeddings endpoints). */
  baseUrl: string;
  apiKey: string;
  embeddingModel?: string;
  chatModel?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Development AI adapter targeting the NVIDIA NIM API (ADR 0004).
 * Production is expected to move to DeepSeek without rewriting pipeline modules.
 *
 * Thin v1: real HTTP when configured; throws a clear error if credentials
 * are missing so local work uses FakeAiPort instead.
 */
export class NimAiPort implements AiPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly embeddingModel: string;
  private readonly chatModel: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: NimAiPortConfig) {
    if (!config.apiKey.trim()) {
      throw new Error(
        "NimAiPort requires an API key. Use FakeAiPort in tests or set NIM_API_KEY for development.",
      );
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.embeddingModel = config.embeddingModel ?? "nvidia/nv-embedqa-e5-v5";
    this.chatModel = config.chatModel ?? "meta/llama-3.1-8b-instruct";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async embed(input: { text: string }): Promise<number[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: input.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`NIM embeddings failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = body.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new Error("NIM embeddings response missing vector");
    }
    return embedding;
  }

  async scoreArticleForInstrument(input: {
    articleTitle: string;
    articleBody: string;
    ticker: string;
  }): Promise<ArticleInstrumentScore> {
    const system = [
      "You score news coverage for Pre-Trade Research.",
      "Return JSON only with keys: bias (bullish|bearish|neutral), biasRationale,",
      "sentiment (calm|alarmist|neutral), sentimentRationale.",
      "Bias is market framing for the named Instrument; Sentiment is tone — independent.",
      "Rationales must be coverage-only. Never use buy, sell, hold, recommend, or should act language.",
    ].join(" ");

    const user = [
      `Instrument ticker: ${input.ticker}`,
      `Title: ${input.articleTitle}`,
      `Body: ${input.articleBody}`,
    ].join("\n");

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.chatModel,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      throw new Error(`NIM chat score failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("NIM chat score response missing content");
    }
    return parseScoreJson(content);
  }
}

function parseScoreJson(content: string): ArticleInstrumentScore {
  const parsed = JSON.parse(content) as Partial<ArticleInstrumentScore>;
  const bias = parsed.bias;
  const sentiment = parsed.sentiment;
  if (
    bias !== "bullish" &&
    bias !== "bearish" &&
    bias !== "neutral"
  ) {
    throw new Error("NIM score JSON missing valid bias");
  }
  if (
    sentiment !== "calm" &&
    sentiment !== "alarmist" &&
    sentiment !== "neutral"
  ) {
    throw new Error("NIM score JSON missing valid sentiment");
  }
  if (!parsed.biasRationale?.trim() || !parsed.sentimentRationale?.trim()) {
    throw new Error("NIM score JSON missing rationales");
  }
  return {
    bias,
    biasRationale: parsed.biasRationale.trim(),
    sentiment,
    sentimentRationale: parsed.sentimentRationale.trim(),
  };
}
