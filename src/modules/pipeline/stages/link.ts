import type { InstrumentCatalog } from "@/modules/dashboard/instrument-catalog";
import type { PipelineBatch } from "@/modules/pipeline/types";

/**
 * Explicit Instrument linking: cashtags ($AAPL), bare ticker tokens, and
 * Source metadata tickers. NLP entity linking is out of scope for this thin path.
 * Only known catalog Instruments are linked.
 */
export async function linkArticlesToInstruments(
  batch: PipelineBatch,
  catalog: InstrumentCatalog,
): Promise<PipelineBatch> {
  const known = await knownTickers(catalog, batch);
  const articles = batch.articles.map((article) => {
    const found = new Set<string>();

    for (const ticker of article.metadataTickers) {
      if (known.has(ticker)) {
        found.add(ticker);
      }
    }

    const text = `${article.title}\n${article.body}`;
    for (const ticker of known) {
      if (mentionsTicker(text, ticker)) {
        found.add(ticker);
      }
    }

    return {
      ...article,
      instrumentLinks: [...found].sort(),
    };
  });

  return { ...batch, articles };
}

async function knownTickers(
  catalog: InstrumentCatalog,
  batch: PipelineBatch,
): Promise<Set<string>> {
  // Collect candidates from metadata + token scan of a wide equity/ETF set
  // by probing common tickers from feed text against the catalog.
  const candidates = new Set<string>();

  for (const article of batch.articles) {
    for (const t of article.metadataTickers) {
      candidates.add(t.trim().toUpperCase());
    }
    for (const match of `${article.title}\n${article.body}`.matchAll(
      /\$?([A-Z]{1,5}(?:\.[A-Z])?)\b/g,
    )) {
      candidates.add(match[1]!.toUpperCase());
    }
  }

  const known = new Set<string>();
  for (const ticker of candidates) {
    const instrument = await catalog.findByTicker(ticker);
    if (instrument) {
      known.add(instrument.ticker);
    }
  }
  return known;
}

function mentionsTicker(text: string, ticker: string): boolean {
  const escaped = ticker.replace(/\./g, "\\.");
  // Cashtag or whole-word ticker (uppercase token in source text).
  const cashtag = new RegExp(`\\$${escaped}\\b`);
  const bare = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`);
  return cashtag.test(text) || bare.test(text);
}
