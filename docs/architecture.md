# Architecture

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: SQLite
- Data portability: repository-style backend organization so SQLite can later be replaced with Postgres-backed repositories

## Backend shape

The backend is organized around operational modules instead of one large application file.

```text
backend/src/
  api/            Express routes and request helpers
  db/             Database bootstrap, schema, and seed data
  repositories/   Data access mapping and persistence helpers
  services/       Product workflows and CRUD operations
  crawlers/       Website crawling and HTML signal extraction
  seo/            Audit engine and scoring logic
  content/        Topic discovery, plan generation, draft composition
  exports/        Reserved for future export providers
  agent/
    core/         Workflow agent orchestration
    tools/        Structured tools for analysis, audit, planning, drafting
    prompts/      Prompt and content-generation guidance
    planners/     Workflow sequencing
    memory/       Website context snapshotting
```

## Frontend shape

The frontend separates the landing page from the application shell and keeps each workflow page focused on one operator task.

```text
frontend/src/
  api/         Client helpers for backend routes
  components/  Shared UI primitives
  hooks/       Async loading and website selection hooks
  layout/      Sidebar + top header shell
  pages/       Landing page and workflow pages
  styles/      Global UI system
  utils/       Formatting helpers
```

## Data model summary

Core entities:

- `Website`
- `WebsitePage`
- `WebsiteAnalysisRun`
- `SeoAuditRun`
- `ContentOpportunity`
- `ArticlePlan`
- `Draft`
- `AutomationRun`
- `ExportJob`

JSON-heavy fields are stored as text in SQLite and mapped back into typed arrays/objects in repository mappers.

## Agent orchestration

The MVP includes a backend agent layer responsible for structured tasks:

- Analyze website
- Run SEO audit
- Find article opportunities
- Generate article plans
- Generate automatic drafts

This agent is intentionally tool-based so later integrations with real LLM providers, search APIs, embeddings, memory stores, and schedulers can slot in without rewriting the product flow.

## Replaceability and extension

The app is structured so future monetizable SaaS features can be added safely:

- Subscription plans
- Website count limits
- Article count limits
- Premium automation tiers
- CMS publishing integrations
- Postgres migration
- Real background jobs and scheduling
