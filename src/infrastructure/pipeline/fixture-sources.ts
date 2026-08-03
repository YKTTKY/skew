import type { SourceFeedItem } from "@/modules/pipeline/types";

function daysBefore(asOf: Date, days: number): string {
  const d = new Date(asOf.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Curated fixture Source feed for the pipeline path.
 * Includes: cashtag / bare ticker / metadata linking, NLP entity linking,
 * market-wide macro → major index ETFs, sector-wide no-flood, multi-Article
 * Story clustering, near-identical syndication, multi-Instrument Articles,
 * and unlinked noise that must never reach trader-facing surfaces.
 */
export function buildPipelineFixtureFeed(
  asOf: Date = new Date(),
): SourceFeedItem[] {
  return [
    {
      sourceName: "Reuters",
      title: "Apple expands services revenue",
      body: "Cupertino reported stronger recurring services lines. $AAPL shares were little changed in after-hours commentary as analysts parsed the mix.",
      publishedAt: daysBefore(asOf, 3),
      externalId: "wire-apple-services-2026",
    },
    // Near-identical syndication of the same wire piece.
    {
      sourceName: "The Wall Street Journal",
      title: "Apple expands services revenue",
      body: "Cupertino reported stronger recurring services lines. $AAPL shares were little changed in after-hours commentary as analysts parsed the mix.",
      publishedAt: daysBefore(asOf, 3),
      externalId: "wire-apple-services-2026",
    },
    // Related (not syndicated) piece — same services-revenue event; clusters via embeddings.
    {
      sourceName: "Bloomberg",
      title: "Services mix lifts Apple as hardware stays steady",
      body: "Apple expands services revenue as recurring services lines outpaced hardware in Cupertino commentary. After-hours notes parsed the services mix; $AAPL was little changed while analysts framed services growth as constructive.",
      publishedAt: daysBefore(asOf, 2),
      externalId: "bbg-apple-services-mix",
    },
    {
      sourceName: "Bloomberg",
      title: "Suppliers note steady component orders for phones",
      body: "Asian suppliers said component bookings for premium phones remained steady. Several notes mentioned AAPL order visibility into the next quarter.",
      publishedAt: daysBefore(asOf, 5),
      externalId: "bbg-suppliers-phones",
    },
    {
      sourceName: "Financial Times",
      title: "Antitrust officials examine tech partnership terms",
      body: "Regulators are reviewing proposed collaboration terms between large-cap platforms. Coverage names both $AAPL and $MSFT as counterparties under review.",
      publishedAt: daysBefore(asOf, 10),
      externalId: "ft-antitrust-partnership",
      metadataTickers: ["AAPL", "MSFT"],
    },
    {
      sourceName: "Associated Press",
      title: "Cloud demand outlook stays mixed into next quarter",
      body: "Enterprise software vendors described uneven cloud consumption trends without naming specific tickers in the lede.",
      publishedAt: daysBefore(asOf, 4),
      externalId: "ap-cloud-outlook",
      // Explicit metadata-only link (no ticker/cashtag in body).
      metadataTickers: ["MSFT"],
    },
    // NLP entity linking only — company name, no ticker/cashtag/metadata.
    {
      sourceName: "Reuters",
      title: "Apple unveils new device lineup for the holiday quarter",
      body: "Apple said its latest hardware refresh targets holiday demand. Executives framed the product cycle without citing any exchange ticker symbols.",
      publishedAt: daysBefore(asOf, 6),
      externalId: "reuters-apple-device-lineup",
    },
    // Market-wide macro — attach major index ETFs only, not every equity.
    {
      sourceName: "Bloomberg",
      title: "U.S. stocks climb as soft inflation lifts major indexes",
      body: "The stock market advanced broadly as investors digested cooler inflation prints. Wall Street treated the session as a market-wide risk-on move across major indexes rather than a single-name story.",
      publishedAt: daysBefore(asOf, 1),
      externalId: "bbg-macro-soft-inflation",
    },
    // Macro + explicit Instrument — index ETFs plus named equity.
    {
      sourceName: "Financial Times",
      title: "Markets firm while Apple leads large-cap gains",
      body: "U.S. stocks edged higher in a broad market-wide session on Wall Street. Apple shares led large-cap gains after product commentary, with $AAPL named in the tape summary.",
      publishedAt: daysBefore(asOf, 1),
      externalId: "ft-macro-apple-leads",
    },
    // Sector-wide piece — must not auto-link every tech equity or flood Watchlists.
    {
      sourceName: "Sector Wire",
      title: "Technology stocks rally on AI optimism across the sector",
      body: "Technology stocks moved higher as traders rotated into the sector on AI optimism. Coverage stayed sector-wide without naming individual companies or tickers.",
      publishedAt: daysBefore(asOf, 2),
      externalId: "sector-tech-ai-rally",
    },
    {
      sourceName: "Generic Wire",
      title: "Column without any Instrument markers or metadata",
      body: "Markets feel uncertain this week according to one columnist, with no companies named.",
      publishedAt: daysBefore(asOf, 2),
      externalId: "generic-unlinked-column",
    },
    {
      sourceName: "Local Desk",
      title: "Weekend weather may slow travel plans",
      body: "Rain is expected across the region, which may affect weekend leisure travel.",
      publishedAt: daysBefore(asOf, 1),
      externalId: "weather-weekend",
    },
  ];
}
