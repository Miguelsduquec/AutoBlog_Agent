# Autoblog Agent

Autoblog Agent is an AI-powered SEO blog automation platform that generates niche-relevant blog articles automatically for any website.

## Current phase

The current implementation is intentionally focused on a practical MVP foundation across Phase 1 through Phase 6:

- Project scaffold
- SQLite schema
- Seed data
- Dashboard
- Websites CRUD
- Website Analysis page
- Opportunities CRUD
- Automatic opportunity generation from latest website analysis
- Article plan generation from content opportunities
- Draft generation from article plans
- Export packaging for publication-ready article assets
- Manual automation runs for the full multi-step article pipeline
- Core docs

The main focus is now the workflow from website analysis to opportunities to article plans to structured draft objects, export packages, and manually triggered automation runs.

## What it includes

- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript backend
- SQLite MVP data layer with seed data
- Website analysis, SEO audit, analysis-based opportunity generation, plan generation, draft generation, automation runs, and export packaging
- Landing page plus operational SaaS application UI

## Run locally

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
npm install
```

3. Seed the demo database:

```bash
npm run seed
```

4. Start frontend and backend together:

```bash
npm run dev
```

5. Open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

## Build

```bash
npm run build
```

## Project structure

```text
frontend/   React app, landing page, SaaS UI, workflow pages
backend/    Express API, SQLite schema, seed data, agent orchestration, exports
docs/       Product, architecture, and roadmap notes
```

## Phase docs

- `docs/phase-1.md`
- `docs/phase-2.md`
- `docs/phase-3.md`
- `docs/phase-4.md`
- `docs/phase-5.md`
- `docs/phase-6.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/roadmap.md`

## Notes

- The backend no longer seeds demo data automatically on boot. Seed explicitly with `npm run seed`.
- If you want demo-style auto-seeding for a temporary environment, set `SEED_ON_BOOT=true`.
- The crawler, website analysis, opportunity generation, article planning, draft generation, automation orchestration, and export services are modular mock implementations so real AI providers or CMS integrations can replace them later without changing the product workflow.
- Export packages are written to `backend/output`.
- Automation runs are synchronous in this MVP and are intentionally structured so queues or background workers can be added later.
