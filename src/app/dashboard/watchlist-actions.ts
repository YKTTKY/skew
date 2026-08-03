"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getInstrumentCatalog } from "@/infrastructure/persistence/instrument-catalog";
import { getPersonalSurfaceStore } from "@/infrastructure/persistence/personal-surface-store";
import { searchInstruments } from "@/modules/dashboard/search-instruments";
import {
  addInstrumentToWatchlist,
  removeInstrumentFromWatchlist,
} from "@/modules/dashboard/watchlist-mutations";

export type WatchlistActionState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

/**
 * Server actions for Watchlist mutations — auth session + personal store only.
 */
export async function addToWatchlistAction(
  ticker: string,
): Promise<WatchlistActionState> {
  const session = await getAuthSession();
  const result = await addInstrumentToWatchlist(
    session,
    getPersonalSurfaceStore(),
    getInstrumentCatalog(),
    ticker,
  );

  if (result.status === "unauthenticated") {
    return { status: "error", message: "Sign in to manage your Watchlist." };
  }
  if (result.status === "unknown_instrument") {
    return {
      status: "error",
      message: "That ticker is not a known US equity or ETF in Skew yet.",
    };
  }

  revalidatePath("/dashboard");
  return { status: "ok" };
}

export async function removeFromWatchlistAction(
  ticker: string,
): Promise<WatchlistActionState> {
  const session = await getAuthSession();
  const result = await removeInstrumentFromWatchlist(
    session,
    getPersonalSurfaceStore(),
    ticker,
  );

  if (result.status === "unauthenticated") {
    return { status: "error", message: "Sign in to manage your Watchlist." };
  }

  revalidatePath("/dashboard");
  return { status: "ok" };
}

export async function searchInstrumentsAction(query: string) {
  const session = await getAuthSession();
  return searchInstruments(session, getInstrumentCatalog(), query);
}
