/** Clerk (or test double) subject id for a Retail Trader account. */
export type RetailTraderId = string;

/** Authenticated Retail Trader session at the Pre-Trade Research surface. */
export type RetailTraderSession = {
  retailTraderId: RetailTraderId;
};

/** Session present for a signed-in Retail Trader, or null when unauthenticated. */
export type AuthSession = RetailTraderSession | null;
