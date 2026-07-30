# Supabase Realtime for live Dashboard updates

Open Watchlist home and Instrument Views subscribe via **Supabase Realtime** when new Stories or scores land for relevant Instruments. We rejected custom WebSockets/SSE on the Next.js server (more sticky state and ops) and pure polling (weaker live feel). Consequence: schema and RLS must allow clients to subscribe only to rows they’re allowed to see; worker writes must be shaped so Realtime payloads stay small and useful.
