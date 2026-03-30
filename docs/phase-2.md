# Phase 2: Automatic Opportunity Generation

Phase 2 turns website analysis into a structured content opportunity workflow.

## Goal

Use the latest `WebsiteAnalysisRun` for a website to automatically generate a clean list of niche-relevant article opportunities.

## Included in this phase

- Read the latest website analysis run
- Use extracted SEO and content signals:
  - title
  - meta description
  - h1
  - h2 headings
  - main text content
  - extracted keywords
  - niche summary
- Generate 10 mock opportunities with structured metadata
- Persist only non-duplicate opportunities for the same website
- Return creation counts, skipped duplicates, and a summary message
- Trigger generation from the Website Detail page
- Surface generated opportunities immediately in the Opportunities workspace

## Backend additions

- `backend/src/services/opportunityGeneratorService.ts`
- `POST /api/websites/:id/generate-opportunities`

The generator is intentionally heuristic-based for now. It does not call a real AI provider yet. Instead, it combines extracted phrases with reusable templates such as:

- what is X
- how to use X
- best X
- X for audience
- X vs Y
- common mistakes with X
- benefits of X
- X cost
- X in location

This keeps the workflow realistic while preserving a clean swap point for a future LLM-backed provider.

## Opportunity structure

Each generated opportunity includes:

- `keyword`
- `topic`
- `cluster`
- `intent`
- `priority`
- `relevanceScore`
- `estimatedDifficulty`
- `source = "analysis"`
- `status = "new"`

## Relevance scoring

The current scoring is heuristic:

- higher when the base phrase appears in the title
- higher when it appears in the h1
- higher when it repeats across h2 headings
- slightly higher for commercially meaningful patterns such as `best`, `cost`, or `for [audience]`

## Duplicate handling

Duplicate control is website-specific.

- exact and near-similar keywords are skipped
- both existing database rows and in-batch generated rows are checked
- the API returns how many opportunities were skipped

## Frontend changes

### Website Detail

- `Analyze Website` remains the first prerequisite
- `Generate Opportunities` is disabled until analysis exists
- the page shows the generation summary after each run
- latest opportunities refresh automatically

### Opportunities page

- generated rows appear after refresh
- source filter is available
- intent badges are visible
- priority badges are visible
- topic and keyword are separated for better operator scanning

## Out of scope

Phase 2 does not yet cover:

- article plan optimization
- full draft generation quality improvements
- publishing integrations
- real LLM-backed opportunity discovery
