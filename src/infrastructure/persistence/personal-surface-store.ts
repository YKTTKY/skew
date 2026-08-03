import type { PersonalSurfaceStore } from "@/modules/dashboard/personal-surface";
import { InMemoryPersonalSurfaceStore } from "@/infrastructure/persistence/in-memory-personal-surface";

/**
 * Composition root for personal (Retail-Trader-scoped) Dashboard data.
 *
 * In-memory store keyed by retailTraderId provides behavior-level multi-tenant
 * isolation (RLS baseline). Durable Supabase Postgres + Clerk JWT RLS can replace
 * this adapter without changing Dashboard application APIs.
 */
const store = new InMemoryPersonalSurfaceStore();

export function getPersonalSurfaceStore(): PersonalSurfaceStore {
  return store;
}
