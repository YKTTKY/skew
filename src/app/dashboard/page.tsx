import { redirect } from "next/navigation";
import { WatchlistManager } from "@/app/dashboard/watchlist-manager";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getPersonalSurfaceStore } from "@/infrastructure/persistence/personal-surface-store";
import { getWatchlistHome } from "@/modules/dashboard/watchlist-home";

/**
 * Watchlist home — current set, empty state, and Instrument search/add/remove.
 */
export default async function DashboardHomePage() {
  const session = await getAuthSession();
  const home = await getWatchlistHome(session, getPersonalSurfaceStore());

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

      <WatchlistManager
        instruments={home.instruments}
        empty={home.empty}
        emptyStateMessage={home.emptyStateMessage}
      />
    </main>
  );
}
