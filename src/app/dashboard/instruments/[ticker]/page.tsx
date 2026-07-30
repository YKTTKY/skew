import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getInstrumentResearch } from "@/modules/dashboard/instrument-research";

type InstrumentPageProps = {
  params: Promise<{ ticker: string }>;
};

/**
 * Instrument View shell — auth-gated Pre-Trade Research surface for one Instrument.
 * Issue 01: empty Stories state; later issues seed scored Stories.
 */
export default async function InstrumentViewPage({ params }: InstrumentPageProps) {
  const { ticker } = await params;
  const session = await getAuthSession();
  const research = await getInstrumentResearch(session, ticker);

  if (research.status === "unauthenticated") {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-800">
          ← Watchlist
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
        {research.ticker}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Instrument View · Pre-Trade Research</p>

      {research.empty ? (
        <section
          className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center"
          data-testid="instrument-empty-state"
        >
          <p className="text-base text-zinc-700">{research.emptyStateMessage}</p>
        </section>
      ) : null}
    </main>
  );
}
