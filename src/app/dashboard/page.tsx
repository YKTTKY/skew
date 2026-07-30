import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getPersonalSurfaceStore } from "@/infrastructure/persistence/personal-surface-store";
import { getWatchlistHome } from "@/modules/dashboard/watchlist-home";

/**
 * Watchlist home — authenticated empty state when the Retail Trader has no Instruments.
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

      {home.empty ? (
        <section
          className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center"
          data-testid="watchlist-empty-state"
        >
          <p className="text-base text-zinc-700">{home.emptyStateMessage}</p>
          <p className="mt-3 text-sm text-zinc-500">
            You can open an Instrument View by ticker once research surfaces are
            available — for example{" "}
            <Link
              href="/dashboard/instruments/SPY"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              SPY
            </Link>
            .
          </p>
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {home.instruments.map((instrument) => (
            <li key={instrument.ticker}>
              <Link
                href={`/dashboard/instruments/${instrument.ticker}`}
                className="block px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                {instrument.ticker}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
