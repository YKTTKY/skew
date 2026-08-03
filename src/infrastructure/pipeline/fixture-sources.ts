import type { SourceFeedItem } from "@/modules/pipeline/types";

function daysBefore(asOf: Date, days: number): string {
  const d = new Date(asOf.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Curated fixture Source feed for the thin pipeline path.
 * Includes: cashtag linking, bare ticker linking, metadata-only linking,
 * near-identical syndication (two Sources), multi-Instrument Article,
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
