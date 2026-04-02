# TESTING.md

## Testing Philosophy

Autoblog Agent should be tested in layers.

1. test deterministic service logic first
2. test public API flows second
3. use manual UI checks only after build and backend tests are green
4. use Playwright to verify the implemented user workflows end to end across desktop, tablet, and mobile

The goal is not to snapshot everything. The goal is to protect the workflow:

- register, login, logout
- subscription checkout and billing state
- website analysis
- opportunity generation
- article planning
- draft generation
- export packaging
- automation orchestration
- responsive app navigation and key tables/forms
- public top-of-funnel grading flow

Tests should be:

- deterministic
- isolated from the main local database
- isolated from the real export directory
- independent from live network calls

## Current Automated Test Scope

Backend tests currently cover:

- `AuthService`
- `BillingService`
- `AnalysisService`
- `OpportunityGeneratorService`
- `ArticlePlanService`
- `DraftService`
- `ExportJobService`
- `AutomationRunService`
- key API flows for:
  - auth session, login, and logout
  - subscription checkout and webhook updates
  - analysis
  - opportunity generation
  - plan generation
  - draft generation
  - export
  - automation runs

The backend test harness uses a temporary SQLite database and temporary export directory under `/tmp`.

Playwright E2E tests use:

- a temporary SQLite database under `/tmp/autoblog-playwright`
- a temporary export directory under `/tmp/autoblog-playwright/exports`
- local mock websites from `validation/mock-site-server.mjs`
- device projects for desktop, tablet, and mobile

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

Local billing defaults to `BILLING_MODE=mock`, so tests can exercise the paid-only flow without live Stripe credentials.

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

Install Playwright browser binaries:

```bash
npm run playwright:install
```

Run Playwright E2E tests:

```bash
npm run playwright:test
```

This script builds the backend and frontend first, then starts the local E2E servers.

Run Playwright E2E tests in headed mode:

```bash
npm run playwright:test:headed
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
npm run playwright:test
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
npm run playwright:test
```

Then manually check the affected page if the change is highly visual or interaction-heavy.

### Change to responsive layout, navigation, or public marketing pages

Run:

```bash
npm run build
npm run playwright:test
```

## What Tests Should Avoid

- no live website crawling in automated tests
- no use of the real `backend/data/autoblog-agent.db`
- no use of the real `backend/output` directory
- no dependency on a running dev server
- no broad snapshot tests for generated markdown or HTML when focused structural assertions are enough
- no brittle full-app screenshots for every page or device
- no dependency on live third-party websites for E2E coverage

## Remaining Manual Checks

Some areas still benefit from manual verification after code changes:

- long-form draft readability in the browser
- dense data tables on very small phones
- browser-native share behavior in the free tool
- nuanced spacing and typography polish on pages with unusually large data payloads
- export package inspection from the UI
