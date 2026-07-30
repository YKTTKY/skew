# Workers

Separate entrypoints for long-running pipeline work (ingest → embed → link → cluster → score). Deployed apart from the Next.js web process (ADR 0001).

No worker jobs ship in issue 01 (Authenticated Dashboard shell). Pipeline entrypoints land with the thin fixture path (issue 06).
