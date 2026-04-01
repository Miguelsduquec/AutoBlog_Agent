# TESTING.md

## Testing Philosophy

Autoblog Agent should be tested in layers.

1. test deterministic service logic first
2. test public API flows second
3. use manual UI checks only after build and backend tests are green

The goal is not to snapshot everything. The goal is to protect the workflow:

- website analysis
- opportunity generation
- article planning
- draft generation
- export packaging
- automation orchestration

Tests should be:

- deterministic
- isolated from the main local database
- isolated from the real export directory
- independent from live network calls

## Current Automated Test Scope

Backend tests currently cover:

- `AnalysisService`
- `OpportunityGeneratorService`
- `ArticlePlanService`
- `DraftService`
- `ExportJobService`
- `AutomationRunService`
- key API flows for:
  - analysis
  - opportunity generation
  - plan generation
  - draft generation
  - export
  - automation runs

The backend test harness uses a temporary SQLite database and temporary export directory under `/tmp`.

## Exact Commands

Install dependencies:

```bash
npm install
```

Seed demo data:

```bash
npm run seed
```

Do not rely on automatic seeding during tests. Tests use their own isolated database setup.

Run all backend tests:

```bash
npm run test --workspace backend
```

Run backend tests in watch mode:

```bash
npm run test:watch --workspace backend
```

Run the full build:

```bash
npm run build
```

Run build plus backend tests as a release gate:

```bash
npm run test --workspace backend && npm run build
```

## When To Run What

### Change to generators or scoring heuristics

Run:

```bash
npm run test --workspace backend
```

### Change to routes, payload shapes, or automation behavior

Run:

```bash
npm run test --workspace backend
npm run build
```

### Change to schema, repositories, or seed data

Run:

```bash
npm run seed
npm run test --workspace backend
npm run build
```

### Change to frontend-only UI

Run:

```bash
npm run build
```

Then manually check the affected page.

## What Tests Should Avoid

- no live website crawling in automated tests
- no use of the real `backend/data/autoblog-agent.db`
- no use of the real `backend/output` directory
- no dependency on a running dev server
- no broad snapshot tests for generated markdown or HTML when focused structural assertions are enough

## Remaining Manual Checks

Some areas still benefit from manual verification after code changes:

- landing page polish
- multi-page app navigation
- long-form draft readability in the browser
- table/filter UX
- export package inspection from the UI
