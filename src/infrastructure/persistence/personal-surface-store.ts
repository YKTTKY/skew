import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import { InMemoryPersonalSurfaceStore } from "@/infrastructure/persistence/in-memory-personal-surface";

/**
 * Composition root for personal (Retail-Trader-scoped) Dashboard data.
 *
 * Issue 01: in-memory store keyed by retailTraderId (app-layer identity isolation).
 * Issue 02+ replaces this with Supabase Postgres + Clerk JWT RLS for durable Watchlists.
 */
const store = new InMemoryPersonalSurfaceStore();

export function getPersonalSurfaceStore(): PersonalSurfaceStore {
  return store;
}
