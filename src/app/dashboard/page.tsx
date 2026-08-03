import Link from "next/link";
import { redirect } from "next/navigation";
import { WatchlistManager } from "@/app/dashboard/watchlist-manager";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getPersonalSurfaceStore } from "@/infrastructure/persistence/personal-surface-store";
import { getResearchSurfaceStore } from "@/infrastructure/persistence/research-surface-store";
import {
  getWatchlistHome,
  type WatchlistHomeStory,
} from "@/modules/dashboard/watchlist-home";
import type {
  BiasLabel,
  SentimentLabel,
} from "@/modules/dashboard/research-surface";

/**
 * Watchlist home — current set, prioritized Stories/scores, and Instrument navigation.
 */
export default async function DashboardHomePage() {
  const session = await getAuthSession();
  const home = await getWatchlistHome(session, {
    personalStore: getPersonalSurfaceStore(),
    researchStore: getResearchSurfaceStore(),
  });

  if (home.status === "unauthenticated") {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Watchlist
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pre-Trade Research home for Instruments you follow.
      </p>

      {!home.empty ? (
        <HomeStoriesSection
          stories={home.stories}
          noCoverage={home.noCoverage}
          noCoverageMessage={home.noCoverageMessage}
        />
      ) : null}

      <WatchlistManager
        instruments={home.instruments}
        empty={home.empty}
        emptyStateMessage={home.emptyStateMessage}
      />
    </main>
  );
}

function HomeStoriesSection({
  stories,
  noCoverage,
  noCoverageMessage,
}: {
  stories: WatchlistHomeStory[];
  noCoverage: boolean;
  noCoverageMessage: string;
}) {
  if (noCoverage) {
    return (
      <section
        className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center"
        data-testid="watchlist-no-coverage-state"
      >
        <p className="text-base text-zinc-700">{noCoverageMessage}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Your Watchlist Instruments are below — open any ticker for Instrument View
          research, even when home has no Stories yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4" data-testid="watchlist-home-stories">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          Stories for your Watchlist
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Scan Bias and Sentiment for Instruments you follow, then open Instrument
          View for deeper Pre-Trade Research.
        </p>
      </div>
      {stories.map((story) => (
        <HomeStoryCard key={story.id} story={story} />
      ))}
    </section>
  );
}

function HomeStoryCard({ story }: { story: WatchlistHomeStory }) {
  return (
    <article
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      data-testid={`home-story-${story.id}`}
    >
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-zinc-900">{story.title}</h3>
        <p className="text-xs text-zinc-500">
          Updated {formatFreshness(story.updatedAt)}
        </p>
      </header>

      <ul className="mt-4 space-y-3">
        {story.relatedInstruments.map((related) => (
          <li
            key={related.ticker}
            className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
            data-testid={`home-story-${story.id}-instrument-${related.ticker}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/dashboard/instruments/${encodeURIComponent(related.ticker)}`}
                className="text-sm font-semibold text-zinc-900 hover:underline"
              >
                {related.ticker}
              </Link>
              <Link
                href={`/dashboard/instruments/${encodeURIComponent(related.ticker)}`}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Open Instrument View →
              </Link>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <ScoreChip
                axis="Bias"
                label={related.bias.label}
                rationale={related.bias.rationale}
                kind="bias"
              />
              <ScoreChip
                axis="Sentiment"
                label={related.sentiment.label}
                rationale={related.sentiment.rationale}
                kind="sentiment"
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ScoreChip({
  axis,
  label,
  rationale,
  kind,
}: {
  axis: "Bias" | "Sentiment";
  label: BiasLabel | SentimentLabel;
  rationale: string;
  kind: "bias" | "sentiment";
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white px-2.5 py-2">
      <p className="text-xs font-medium text-zinc-500">
        {axis}{" "}
        <span className={`font-semibold capitalize ${scoreTone(kind, label)}`}>
          {label}
        </span>
      </p>
      <p className="mt-1 text-xs text-zinc-600">{rationale}</p>
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
