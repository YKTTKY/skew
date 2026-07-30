# Postgres-backed job queue for the pipeline

Ingest → embed → link → cluster → score runs as **async background jobs** on a **Postgres-backed queue** (e.g. pg-boss or equivalent queue tables on Supabase). We rejected Redis/BullMQ for v1 to avoid another paid dependency on a free-tier stack, and rejected in-process-only cron on the web dyno because LLM and embedding work would compete with Dashboard requests. Near-real-time means **minutes**, which Postgres job polling can meet.
