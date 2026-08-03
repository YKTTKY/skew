import type { ResearchLiveBus } from "@/modules/dashboard/research-live";
import { InMemoryResearchLiveBus } from "@/infrastructure/realtime/in-memory-research-live-bus";

/**
 * Composition root for research live delivery.
 *
 * Process-local in-memory bus matches the current in-memory research store and
 * job queue (ADR 0002 / 0005 interim). Same process: pipeline publish and
 * Dashboard live transport share this bus.
 *
 * Production delivery is Supabase Realtime with RLS-scoped channels (ADR 0006).
 * Cross-process web vs worker will not share this singleton — replace this
 * adapter (and the SSE transport) when Postgres research + Realtime land.
 */
const bus = new InMemoryResearchLiveBus();

export function getResearchLiveBus(): ResearchLiveBus {
  return bus;
}
