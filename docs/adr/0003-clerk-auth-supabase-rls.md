# Clerk auth with Supabase RLS via JWT

Retail Trader accounts use **Clerk**. Supabase is configured to accept **Clerk JWTs** so **RLS** can enforce Watchlist and personal data access by authenticated subject. We rejected Supabase Auth (to keep Clerk’s product UX) and “service-role only, no RLS” (too much trust in the app server once multi-tenant). Consequence: every data path that should be user-scoped must carry a user JWT or go through carefully reviewed service-role worker paths.
