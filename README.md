# Autoblog Agent

Autoblog Agent is an AI-powered SEO blog automation platform that generates niche-relevant blog articles automatically for any website.

## What it includes

- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript backend
- SQLite MVP data layer with seed data
- Website analysis, SEO audit, topic discovery, plan generation, draft generation, automation runs, and export packaging
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

## Notes

- The backend seeds demo data automatically on first run and also supports manual reseeding via `npm run seed`.
- The crawler, topic discovery, and drafting services are MVP-ready and intentionally modular so real providers can replace mock logic later.
- Export packages are written to `backend/output`.
