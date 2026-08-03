import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveResearchRefresh } from "@/app/dashboard/live-research-refresh";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getInstrumentCatalog } from "@/infrastructure/persistence/instrument-catalog";
import { getResearchSurfaceStore } from "@/infrastructure/persistence/research-surface-store";
import { getPriceContextProvider } from "@/infrastructure/price/price-context-provider";
import { getInstrumentResearch } from "@/modules/dashboard/instrument-research";
import type {
  BiasLabel,
  InstrumentArticleResearch,
  InstrumentStoryResearch,
  SentimentLabel,
} from "@/modules/dashboard/research-surface";
import type {
  InstrumentPriceContext,
  PriceContext,
} from "@/modules/dashboard/price-context";

type InstrumentPageProps = {
  params: Promise<{ ticker: string }>;
};

/**
 * Instrument View — Pre-Trade Research for one Instrument.
 * Stories with rollups/breakdowns plus lightweight Price Context for orientation.
 * LiveResearchRefresh keeps the open view current when new Stories/scores land.
 */
export default async function InstrumentViewPage({ params }: InstrumentPageProps) {
  const { ticker } = await params;
  const session = await getAuthSession();
  const research = await getInstrumentResearch(session, ticker, {
    catalog: getInstrumentCatalog(),
    researchStore: getResearchSurfaceStore(),
    priceProvider: getPriceContextProvider(),
  });

  if (research.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (research.status === "unknown_instrument") {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <BackToWatchlist />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          {research.ticker}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Instrument View · Pre-Trade Research</p>
        <section
          className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-8 text-center"
          data-testid="instrument-unknown-state"
        >
          <p className="text-base text-amber-950">{research.message}</p>
          <p className="mt-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-amber-900 underline underline-offset-2"
            >
              Back to Watchlist
            </Link>
          </p>
        </section>
      </main>
    );
  }

  if (research.status === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <BackToWatchlist />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          {ticker.trim().toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Instrument View · Pre-Trade Research</p>
        <section
          className="mt-10 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
          data-testid="instrument-error-state"
        >
          <p className="text-base text-red-950">{research.message}</p>
          <p className="mt-4">
            <Link
              href={`/dashboard/instruments/${encodeURIComponent(ticker.trim().toUpperCase())}`}
              className="text-sm font-medium text-red-900 underline underline-offset-2"
            >
              Try again
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <BackToWatchlist />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
        {research.ticker}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Instrument View · Pre-Trade Research</p>

      <LiveResearchRefresh
        surface={{ kind: "instrument", ticker: research.ticker }}
      />

      <PriceContextPanel priceContext={research.priceContext} />

      {research.empty ? (
        <section
          className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center"
          data-testid="instrument-empty-state"
        >
          <p className="text-base text-zinc-700">{research.emptyStateMessage}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Check back as coverage is linked and scored, or return to your{" "}
            <Link
              href="/dashboard"
              className="font-medium text-zinc-800 underline underline-offset-2"
            >
              Watchlist
            </Link>{" "}
            to research another Instrument.
          </p>
        </section>
      ) : (
        <section className="mt-10 space-y-6" data-testid="instrument-stories">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Stories in Research Window
          </h2>
          {research.stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </section>
      )}
    </main>
  );
}

function BackToWatchlist() {
  return (
    <p className="text-sm text-zinc-500">
      <Link href="/dashboard" className="hover:text-zinc-800">
        ← Watchlist
      </Link>
    </p>
  );
}

/**
 * Lightweight last price + simple chart for orientation during Pre-Trade Research.
 * Not a charting or technical-analysis workstation.
 */
function PriceContextPanel({
  priceContext,
}: {
  priceContext: InstrumentPriceContext;
}) {
  if (priceContext.status === "unavailable") {
    return (
      <section
        className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3"
        data-testid="price-context-unavailable"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Price Context
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Price Context is temporarily unavailable. Stories and scores below are
          still available for Pre-Trade Research.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      data-testid="price-context"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Price Context
          </p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900"
            data-testid="price-context-last"
          >
            {formatLastPrice(priceContext)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Last price · orientation only · as of{" "}
            {formatFreshness(priceContext.asOf)}
          </p>
        </div>
        <OrientationChart series={priceContext.series} />
      </div>
    </section>
  );
}

function formatLastPrice(ctx: PriceContext): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ctx.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(ctx.lastPrice);
  } catch {
    return `${ctx.lastPrice.toFixed(2)} ${ctx.currency}`;
  }
}

/** Simple SVG path chart — orientation only, not TA tools. */
function OrientationChart({ series }: { series: PriceContext["series"] }) {
  if (series.length < 2) {
    return null;
  }

  const width = 160;
  const height = 48;
  const pad = 2;
  const prices = series.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const points = series
    .map((point, i) => {
      const x =
        pad + (i / (series.length - 1)) * (width - pad * 2);
      const y =
        height - pad - ((point.price - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Simple price orientation chart"
      data-testid="price-context-chart"
      className="shrink-0 text-zinc-700"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function StoryCard({ story }: { story: InstrumentStoryResearch }) {
  return (
    <article
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      data-testid={`story-${story.id}`}
    >
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-zinc-900">{story.title}</h3>
        <p className="text-xs text-zinc-500">
          Updated {formatFreshness(story.updatedAt)}
        </p>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ScorePanel
          axis="Bias"
          label={story.bias.label}
          rationale={story.bias.rationale}
          kind="bias"
        />
        <ScorePanel
          axis="Sentiment"
          label={story.sentiment.label}
          rationale={story.sentiment.rationale}
          kind="sentiment"
        />
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Articles for this Instrument
        </h4>
        <ul className="mt-3 space-y-4">
          {story.articles.map((article) => (
            <ArticleRow key={article.id} article={article} />
          ))}
        </ul>
      </div>
    </article>
  );
}

function ArticleRow({ article }: { article: InstrumentArticleResearch }) {
  return (
    <li className="rounded-md bg-zinc-50 p-3" data-testid={`article-${article.id}`}>
      <p className="text-sm font-medium text-zinc-900">{article.title}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Sources: {article.sources.join(" · ")}
        <span className="mx-1.5 text-zinc-300">·</span>
        Published {formatFreshness(article.publishedAt)}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ScorePanel
          axis="Bias"
          label={article.bias.label}
          rationale={article.bias.rationale}
          kind="bias"
          compact
        />
        <ScorePanel
          axis="Sentiment"
          label={article.sentiment.label}
          rationale={article.sentiment.rationale}
          kind="sentiment"
          compact
        />
      </div>
    </li>
  );
}

function ScorePanel({
  axis,
  label,
  rationale,
  kind,
  compact = false,
}: {
  axis: "Bias" | "Sentiment";
  label: BiasLabel | SentimentLabel;
  rationale: string;
  kind: "bias" | "sentiment";
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded border border-zinc-200 bg-white px-2.5 py-2"
          : "rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5"
      }
    >
      <p className="text-xs font-medium text-zinc-500">
        {axis}{" "}
        <span className={`font-semibold capitalize ${scoreTone(kind, label)}`}>
          {label}
        </span>
      </p>
      <p className={compact ? "mt-1 text-xs text-zinc-600" : "mt-1 text-sm text-zinc-700"}>
        {rationale}
      </p>
    </div>
  );
}

function scoreTone(
  kind: "bias" | "sentiment",
  label: BiasLabel | SentimentLabel,
): string {
  if (kind === "bias") {
    if (label === "bullish") return "text-emerald-700";
    if (label === "bearish") return "text-rose-700";
    return "text-zinc-700";
  }
  if (label === "alarmist") return "text-amber-800";
  if (label === "calm") return "text-sky-800";
  return "text-zinc-700";
}

function formatFreshness(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
