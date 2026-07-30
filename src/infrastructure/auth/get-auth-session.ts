import { auth } from "@clerk/nextjs/server";
import type { AuthSession } from "@/modules/auth/types";

/**
 * Maps the current request's Clerk session to the Pre-Trade Research auth session.
 * Returns null when no Retail Trader is signed in.
 */
export async function getAuthSession(): Promise<AuthSession> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  return { retailTraderId: userId };
}
