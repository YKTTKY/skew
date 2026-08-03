"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  addToWatchlistAction,
  removeFromWatchlistAction,
  searchInstrumentsAction,
} from "@/app/dashboard/watchlist-actions";
import type { InstrumentRecord } from "@/modules/dashboard/instrument-catalog";

type WatchlistManagerProps = {
  instruments: { ticker: string }[];
  empty: boolean;
  emptyStateMessage: string;
};

/**
 * Watchlist home controls: search Instruments by ticker, add, remove.
 */
export function WatchlistManager({
  instruments,
  empty,
  emptyStateMessage,
}: WatchlistManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstrumentRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const watchlistTickers = new Set(instruments.map((i) => i.ticker));

  const runSearch = useCallback((value: string) => {
    setQuery(value);
    setMessage(null);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      const response = await searchInstrumentsAction(value);
      if (response.status === "unauthenticated") {
        setResults([]);
        setMessage("Sign in to search Instruments.");
        return;
      }
      setResults(response.results);
    });
  }, []);

  const onAdd = (ticker: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await addToWatchlistAction(ticker);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setQuery("");
      setResults([]);
      router.refresh();
    });
  };

  const onRemove = (ticker: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await removeFromWatchlistAction(ticker);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-8 space-y-8">
      <section
        className="rounded-lg border border-zinc-200 bg-white p-5"
        data-testid="instrument-search"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Find Instruments
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Search US equities and ETFs by ticker, then add them to your Watchlist.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Ticker search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => runSearch(event.target.value)}
            placeholder="e.g. AAPL, SPY"
            autoComplete="off"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            data-testid="instrument-search-input"
          />
        </label>

        {results.length > 0 ? (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200">
            {results.map((instrument) => {
              const onList = watchlistTickers.has(instrument.ticker);
              return (
                <li
                  key={instrument.ticker}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {instrument.ticker}
                      <span className="ml-2 text-xs font-normal uppercase tracking-wide text-zinc-400">
                        {instrument.kind}
                      </span>
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {instrument.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending || onList}
                    onClick={() => onAdd(instrument.ticker)}
                    className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                    data-testid={`add-instrument-${instrument.ticker}`}
                  >
                    {onList ? "On Watchlist" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {query.trim() && !isPending && results.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500" data-testid="search-no-results">
            No matching US equity or ETF for that ticker prefix.
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {message}
          </p>
        ) : null}
      </section>

      {empty ? (
        <section
          className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center"
          data-testid="watchlist-empty-state"
        >
          <p className="text-base text-zinc-700">{emptyStateMessage}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Use search above to pick tickers such as{" "}
            <button
              type="button"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
              onClick={() => runSearch("SPY")}
            >
              SPY
            </button>{" "}
            or{" "}
            <button
              type="button"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
              onClick={() => runSearch("AAPL")}
            >
              AAPL
            </button>
            .
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900">Your Watchlist</h2>
          <ul
            className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white"
            data-testid="watchlist-instruments"
          >
            {instruments.map((instrument) => (
              <li
                key={instrument.ticker}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/dashboard/instruments/${instrument.ticker}`}
                  className="text-sm font-medium text-zinc-900 hover:underline"
                >
                  {instrument.ticker}
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onRemove(instrument.ticker)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  data-testid={`remove-instrument-${instrument.ticker}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
