"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

type LiveResearchRefreshProps = {
  /**
   * Open surface: Instrument View (one ticker) or Watchlist home.
   * Watchlist membership is resolved on the server for the signed-in subject.
   */
  surface:
    | { kind: "instrument"; ticker: string }
    | { kind: "watchlist" };
};

/**
 * Keeps an open Watchlist home or Instrument View current when new Stories
 * or scores land. Subscribes to small research invalidations and refreshes
 * server-rendered research without a full manual navigation.
 *
 * Transport is SSE against the process-local research live bus (in-memory
 * research era). Production intent: Supabase Realtime channels (ADR 0006).
 */
export function LiveResearchRefresh({ surface }: LiveResearchRefreshProps) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamUrl = useMemo(() => {
    if (surface.kind === "instrument") {
      const ticker = encodeURIComponent(surface.ticker.trim().toUpperCase());
      return `/api/dashboard/research-live?scope=instrument&ticker=${ticker}`;
    }
    return `/api/dashboard/research-live?scope=watchlist`;
  }, [surface]);

  useEffect(() => {
    const source = new EventSource(streamUrl);

    source.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as {
          type?: string;
        };
        if (payload.type !== "research") {
          return;
        }
        // Coalesce bursts (multi-Story pipeline publish) into one refresh.
        if (refreshTimer.current) {
          clearTimeout(refreshTimer.current);
        }
        refreshTimer.current = setTimeout(() => {
          router.refresh();
        }, 50);
      } catch {
        // Ignore malformed frames.
      }
    };

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
      source.close();
    };
  }, [router, streamUrl]);

  return (
    <p
      className="sr-only"
      data-testid="live-research-refresh"
      aria-live="polite"
    >
      Live research updates enabled for this Dashboard view.
    </p>
  );
}
