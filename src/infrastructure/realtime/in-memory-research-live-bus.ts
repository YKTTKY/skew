import type {
  ResearchLiveBus,
  ResearchLiveEvent,
  ResearchLiveScope,
  ResearchLiveSubscription,
} from "@/modules/dashboard/research-live";
import {
  eventMatchesScope,
  normalizeLiveScope,
} from "@/modules/dashboard/research-live";

type Listener = {
  scope: ResearchLiveScope;
  onEvent: (event: ResearchLiveEvent) => void;
};

/**
 * In-process ResearchLiveBus for tests and single-process Dashboard demos.
 * Production intent: Supabase Realtime + RLS (ADR 0006).
 */
export class InMemoryResearchLiveBus implements ResearchLiveBus {
  private readonly listeners = new Set<Listener>();

  async publish(events: ResearchLiveEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        if (eventMatchesScope(event, listener.scope)) {
          listener.onEvent(event);
        }
      }
    }
  }

  subscribe(
    scope: ResearchLiveScope,
    onEvent: (event: ResearchLiveEvent) => void,
  ): ResearchLiveSubscription {
    const listener: Listener = {
      scope: normalizeLiveScope(scope),
      onEvent,
    };
    this.listeners.add(listener);
    return {
      unsubscribe: () => {
        this.listeners.delete(listener);
      },
    };
  }

  /** Test helper — how many active subscriptions remain. */
  listenerCount(): number {
    return this.listeners.size;
  }
}
