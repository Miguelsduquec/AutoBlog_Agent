# AGENTS.md

## Project Overview

Autoblog Agent is a full-stack MVP for automated SEO content operations.

Core workflow:

1. add a website
2. analyze the website
3. generate content opportunities
4. convert opportunities into article plans
5. generate drafts
6. export publication-ready packages
7. run manual automation workflows across the pipeline

Tech stack:

- frontend: React + Vite + TypeScript
- backend: Node.js + Express + TypeScript
- database: SQLite with a structure intended to be replaceable later

## Architecture Rules

- Keep the backend split by responsibility:
  - `src/api` for HTTP transport only
  - `src/services` for orchestration and workflow logic
  - `src/content`, `src/crawlers`, `src/seo`, `src/exports` for domain-specific generation/extraction logic
  - `src/repositories` for persistence access
  - `src/agent` for multi-step orchestration and future agent expansion
- Do not put business logic directly in Express route handlers.
- Prefer reusing existing services over duplicating workflow logic in routes or UI.
- Keep SQLite-specific behavior isolated to repositories and database bootstrap code.
- Treat `Draft`, `ArticlePlan`, `ContentOpportunity`, and `AutomationRun` as workflow objects with clear status transitions.
- Keep export generation deterministic and filesystem-safe.
- If a new feature needs side effects across multiple workflow steps, add it through the service/orchestrator layer instead of embedding it inside one generator.

## Coding Conventions

- TypeScript strictness should stay on.
- Prefer small pure helper functions for text heuristics and scoring rules.
- Use clear names over clever abstractions.
- Preserve the existing modular folder boundaries.
- Keep UI operational and workflow-oriented, not chat-oriented.
- Add comments only when a code path is non-obvious.
- Prefer deterministic heuristics in tests.
- When changing schema or persistence contracts, update:
  - `backend/src/types.ts`
  - `backend/src/db/schema.ts`
  - relevant repositories/mappers
  - seed data if the new shape affects demo records

## Commands To Run

Install dependencies:

```bash
npm install
```

Seed demo data:

```bash
npm run seed
```

Optional demo-style auto-seeding on boot:

```bash
SEED_ON_BOOT=true npm run dev
```

Run backend and frontend locally:

```bash
npm run dev
```

Build everything:

```bash
npm run build
```

Run backend tests:

```bash
npm run test --workspace backend
```

Run backend tests in watch mode:

```bash
npm run test:watch --workspace backend
```

## How To Test Changes

- For backend workflow changes:
  - run `npm run test --workspace backend`
  - run `npm run build`
- For API contract changes:
  - run backend tests
  - manually verify the relevant page in the UI if the contract feeds frontend tables or detail panels
- For frontend-only changes:
  - run `npm run build`
  - manually check the affected page(s)
- For schema changes:
  - run `npm run seed`
  - run tests
  - run build

## What To Avoid

- Do not add business logic directly into repository functions.
- Do not create parallel generators when an existing generator/service already owns that workflow step.
- Do not introduce hidden startup side effects casually.
- Do not rely on automatic seeding in normal development or test flows.
- Do not depend on live network calls in tests.
- Do not make tests depend on the main local SQLite database or `backend/output`.
- Do not add flashy or generic AI-chat UX that bypasses the operational workflow.
- Do not introduce enterprise-only complexity unless it directly supports the MVP roadmap.
