import { getAuthSession } from "@/infrastructure/auth/get-auth-session";
import { getPersonalSurfaceStore } from "@/infrastructure/persistence/personal-surface-store";
import { getResearchLiveBus } from "@/infrastructure/realtime/research-live-bus";
import type { ResearchLiveEvent } from "@/modules/dashboard/research-live";
import { openResearchLive } from "@/modules/dashboard/open-research-live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE stream of small research invalidations for open Dashboard views.
 * Auth-gated. Watchlist scope is resolved server-side from the signed-in
 * Retail Trader’s PersonalSurfaceStore (client cannot supply another subject’s
 * membership). Instrument scope is one ticker for an open Instrument View.
 *
 * Transport note: process-local bus + SSE is the single-process stand-in while
 * research storage is still in-memory — same interim pattern as the in-memory
 * research store and job queue. Production delivery is Supabase Realtime + RLS
 * (ADR 0006); this route should be replaced by a Realtime channel adapter, not
 * kept as the multi-process product path.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await getAuthSession();
  if (!session) {
    return new Response(JSON.stringify({ status: "unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requested = parseRequestedScope(new URL(request.url).searchParams);
  if (!requested) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Provide scope=instrument&ticker=… or scope=watchlist",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const bus = getResearchLiveBus();
  const personalStore = getPersonalSurfaceStore();
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      void (async () => {
        const opened = await openResearchLive(
          session,
          requested,
          { bus, personalStore },
          (event: ResearchLiveEvent) => {
            send({ type: "research", event });
          },
        );

        if (opened.status !== "ok") {
          send({ type: "error", status: opened.status });
          controller.close();
          return;
        }

        send({ type: "ready", scope: opened.scope });

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            // Stream already closed.
          }
        }, 25_000);

        cleanup = () => {
          clearInterval(heartbeat);
          opened.subscription.unsubscribe();
        };

        request.signal.addEventListener("abort", () => {
          cleanup?.();
          try {
            controller.close();
          } catch {
            // already closed
          }
        });
      })();
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Client only chooses surface kind; Watchlist tickers are never taken from query. */
function parseRequestedScope(
  params: URLSearchParams,
):
  | { kind: "instrument"; ticker: string }
  | { kind: "watchlist" }
  | null {
  const kind = params.get("scope");
  if (kind === "instrument") {
    const ticker = params.get("ticker")?.trim() ?? "";
    if (!ticker) return null;
    return { kind: "instrument", ticker };
  }
  if (kind === "watchlist") {
    return { kind: "watchlist" };
  }
  return null;
}
