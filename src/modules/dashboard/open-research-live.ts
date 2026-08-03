import type { AuthSession } from "@/modules/auth/types";
import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import type {
  ResearchLiveBus,
  ResearchLiveEvent,
  ResearchLiveScope,
  ResearchLiveSubscription,
} from "@/modules/dashboard/research-live";
import { normalizeLiveScope } from "@/modules/dashboard/research-live";

export type OpenResearchLiveResult =
  | { status: "unauthenticated" }
  | { status: "ok"; subscription: ResearchLiveSubscription; scope: ResearchLiveScope };

export type OpenResearchLiveDeps = {
  bus: ResearchLiveBus;
  /**
   * Required when opening a Watchlist home subscription so scope tickers
   * come from this Retail Trader’s personal surface (not client-supplied lists).
   */
  personalStore?: PersonalSurfaceStore;
};

/**
 * Auth-gated open Dashboard live subscription.
 * Instrument scope: any known Instrument the session may research.
 * Watchlist scope: always resolved from PersonalSurfaceStore for this subject.
 * Personal Watchlist membership is never published on the research bus.
 */
export async function openResearchLive(
  session: AuthSession,
  scope: ResearchLiveScope | { kind: "watchlist" },
  deps: OpenResearchLiveDeps,
  onEvent: (event: ResearchLiveEvent) => void,
): Promise<OpenResearchLiveResult> {
  if (!session) {
    return { status: "unauthenticated" };
  }

  const resolved = await resolveScope(session, scope, deps.personalStore);
  if (!resolved) {
    return { status: "unauthenticated" };
  }

  const normalized = normalizeLiveScope(resolved);
  const subscription = deps.bus.subscribe(normalized, onEvent);
  return { status: "ok", subscription, scope: normalized };
}

async function resolveScope(
  session: NonNullable<AuthSession>,
  scope: ResearchLiveScope | { kind: "watchlist" },
  personalStore: PersonalSurfaceStore | undefined,
): Promise<ResearchLiveScope | null> {
  if (scope.kind === "instrument") {
    return { kind: "instrument", ticker: scope.ticker };
  }

  if (!personalStore) {
    // Fail closed: never open a Watchlist live scope without subject isolation.
    return null;
  }

  const tickers = await personalStore.listWatchlistTickers(
    session.retailTraderId,
  );
  return { kind: "watchlist", tickers };
}
