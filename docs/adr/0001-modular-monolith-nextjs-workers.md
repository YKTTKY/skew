# Modular monolith: Next.js web + separate workers

V1 is a **modular monolith** in one TypeScript codebase (Next.js App Router for the Dashboard/API) rather than microservices. Long-running ingest/analyze work runs as **worker entrypoints** in the same repo, deployed separately from the web app (**Vercel** for Next.js; Railway/Fly/Render-class host for workers). We chose this over a single process or early microservices so the vertical slice stays simple to change while still supporting minutes-class background pipelines without blocking HTTP.
