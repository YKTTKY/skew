import type {
  InstrumentCatalog,
  InstrumentRecord,
} from "@/modules/dashboard/instrument-catalog";
import type { PipelineBatch } from "@/modules/pipeline/types";

/**
 * Default major index ETFs for clearly market-wide coverage (ADR 0009 examples).
 * More specific index names can add further majors via resolveMacroIndexLinks.
 */
const DEFAULT_MARKET_WIDE_ETFS = ["SPY", "QQQ"] as const;

/**
 * Instrument linking: explicit tickers/cashtags/metadata, NLP entity names
 * resolved against the catalog, and market-wide pieces → major index ETFs only.
 * Only known catalog Instruments are linked.
 */
export async function linkArticlesToInstruments(
  batch: PipelineBatch,
  catalog: InstrumentCatalog,
): Promise<PipelineBatch> {
  const instruments = await catalog.listAll();
  const knownTickers = new Set(instruments.map((i) => i.ticker));
  const entityAliases = buildEntityAliases(instruments);

  const articles = batch.articles.map((article) => {
    const found = new Set<string>();
    const text = `${article.title}\n${article.body}`;

    for (const ticker of article.metadataTickers) {
      if (knownTickers.has(ticker)) {
        found.add(ticker);
      }
    }

    for (const ticker of knownTickers) {
      if (mentionsTicker(text, ticker)) {
        found.add(ticker);
      }
    }

    for (const ticker of resolveEntityLinks(text, entityAliases)) {
      if (knownTickers.has(ticker)) {
        found.add(ticker);
      }
    }

    for (const ticker of resolveMacroIndexLinks(text)) {
      if (knownTickers.has(ticker)) {
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

type EntityAlias = {
  alias: string;
  ticker: string;
};

/**
 * Build searchable aliases from catalog names plus common brand short forms.
 * Longer aliases are preferred when matching to reduce false positives.
 */
function buildEntityAliases(instruments: InstrumentRecord[]): EntityAlias[] {
  const aliases: EntityAlias[] = [];
  const seen = new Set<string>();

  const add = (alias: string, ticker: string) => {
    const key = `${alias.toLowerCase()}::${ticker}`;
    if (seen.has(key)) {
      return;
    }
    const trimmed = alias.trim();
    if (trimmed.length < 3) {
      return;
    }
    // Avoid ultra-generic single tokens that create false links.
    if (isBlockedEntityAlias(trimmed)) {
      return;
    }
    seen.add(key);
    aliases.push({ alias: trimmed, ticker });
  };

  for (const instrument of instruments) {
    add(instrument.name, instrument.ticker);

    const stripped = stripCorporateSuffixes(instrument.name);
    if (stripped.toLowerCase() !== instrument.name.toLowerCase()) {
      add(stripped, instrument.ticker);
    }

    // First significant brand token (e.g. "Apple" from "Apple Inc.").
    const brand = brandToken(stripped);
    if (brand) {
      add(brand, instrument.ticker);
    }

    for (const extra of extraAliasesForTicker(instrument.ticker)) {
      add(extra, instrument.ticker);
    }
  }

  aliases.sort((a, b) => b.alias.length - a.alias.length);
  return aliases;
}

function stripCorporateSuffixes(name: string): string {
  return name
    .replace(
      /\b(incorporated|inc\.?|corporation|corp\.?|company|co\.?|ltd\.?|llc|plc|class\s+[a-z]|trust|fund|etf)\b\.?/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function brandToken(strippedName: string): string | null {
  const parts = strippedName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  // Prefer multi-word brands when the first token alone is too generic.
  if (parts.length >= 2 && parts[0]!.length <= 4) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] ?? null;
}

/** Well-known brand aliases not fully recoverable from legal names alone. */
const EXTRA_ALIASES_BY_TICKER: Record<string, string[]> = {
  GOOGL: ["Google", "Alphabet"],
  META: ["Meta Platforms", "Facebook"],
  "BRK.B": ["Berkshire Hathaway", "Berkshire"],
  SPY: ["S&P 500 ETF", "SPDR S&P 500"],
  QQQ: ["Invesco QQQ", "Nasdaq-100 ETF"],
};

function extraAliasesForTicker(ticker: string): string[] {
  return EXTRA_ALIASES_BY_TICKER[ticker] ?? [];
}

function isBlockedEntityAlias(alias: string): boolean {
  const lower = alias.toLowerCase();
  // Single very short / common English tokens that appear in macro copy.
  const blocked = new Set([
    "the",
    "and",
    "for",
    "inc",
    "corp",
    "class",
    "trust",
    "fund",
    "etf",
    "group",
    "holdings",
    "international",
    "systems",
    "technologies",
    "energy",
    "financial",
    "advanced",
    "united",
    "american",
    "general",
    "national",
    "global",
    "first",
  ]);
  return blocked.has(lower);
}

function resolveEntityLinks(
  text: string,
  aliases: EntityAlias[],
): string[] {
  const found = new Set<string>();
  for (const { alias, ticker } of aliases) {
    if (mentionsEntityAlias(text, alias)) {
      found.add(ticker);
    }
  }
  return [...found];
}

function mentionsEntityAlias(text: string, alias: string): boolean {
  const escaped = escapeRegExp(alias);
  // Word-boundary-ish match; allow apostrophes/hyphens inside names.
  const pattern = new RegExp(
    `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`,
    "i",
  );
  return pattern.test(text);
}

/**
 * Market-wide coverage → major index ETFs only (never sector equities).
 * Default SPY/QQQ for broad market language; named indexes can add peers.
 * Sector-only framing (e.g. "technology stocks") does not match these patterns.
 */
function resolveMacroIndexLinks(text: string): string[] {
  const found = new Set<string>();

  const broadMarket = [
    /\bU\.?S\.?\s+stocks\b/i,
    /\bstock market\b/i,
    /\bequity markets?\b/i,
    /\bbroader market\b/i,
    /\bmarket as a whole\b/i,
    /\bmarket-wide\b/i,
    /\bmajor indexes\b/i,
    /\bmajor indices\b/i,
    /\bWall Street\b/,
  ];
  if (broadMarket.some((p) => p.test(text))) {
    for (const ticker of DEFAULT_MARKET_WIDE_ETFS) {
      found.add(ticker);
    }
  }

  if (/\bS&P\s*500\b/i.test(text)) {
    found.add("SPY");
    found.add("VOO");
    found.add("IVV");
  }
  if (/\bNasdaq(?:-100| Composite)?\b/i.test(text)) {
    found.add("QQQ");
  }
  if (/\bDow Jones\b/i.test(text)) {
    found.add("DIA");
  }
  if (/\bRussell\s*2000\b/i.test(text)) {
    found.add("IWM");
  }
  if (/\btotal stock market\b/i.test(text)) {
    found.add("VTI");
  }

  return [...found];
}

function mentionsTicker(text: string, ticker: string): boolean {
  const escaped = escapeRegExp(ticker);
  // Cashtag or whole-word ticker token (case-insensitive).
  const cashtag = new RegExp(`\\$${escaped}\\b`, "i");
  const bare = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i");
  return cashtag.test(text) || bare.test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
