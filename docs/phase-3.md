# Phase 3: Article Plan Generation

Phase 3 adds a structured planning layer between content opportunities and full draft generation.

## Goal

Turn each `ContentOpportunity` into a reusable `ArticlePlan` that gives operators a clear editorial direction before draft generation starts.

## Included in this phase

- Generate a structured plan from a single opportunity
- Load related website context before planning
- Use the latest `WebsiteAnalysisRun` as planning context
- Persist plans while avoiding duplicates for the same opportunity
- Support explicit regeneration without creating a second plan row
- Expose article plan listing and detail endpoints
- Surface plan generation directly from the Opportunities page
- Add an operational Article Plans page with filters and detail review

## Planning inputs

The planner combines:

- opportunity keyword
- opportunity topic
- opportunity cluster
- opportunity intent
- opportunity priority
- website niche
- website content goal
- latest niche summary
- latest extracted analysis keywords

## Generated plan fields

Each generated `ArticlePlan` includes:

- `title`
- `targetKeyword`
- `secondaryKeywords`
- `searchIntent`
- `angle`
- `cta`
- `brief`
- `status = "planned"`

## Heuristic planning logic

The current planner is mock-based and intentionally modular.

- Titles adapt to intent so they feel closer to SEO article headlines than raw prompts
- Secondary keywords are derived from the opportunity keyword, cluster, and analysis vocabulary
- CTA copy is aligned with the website content goal
- Briefs explain what the article should cover and how it should connect search demand to the website

Examples of title behavior:

- informational: practical guide framing
- commercial: evaluation or buying-guide framing
- comparison: explicit comparison framing
- local: geography-aware framing

## Duplicate handling

Plans are unique per opportunity by default.

- if a plan already exists and regeneration is not requested, the API returns the existing plan with a skipped response
- if regeneration is requested, the existing row is updated instead of creating a duplicate

## API additions

- `POST /api/opportunities/:id/generate-plan`
- `GET /api/article-plans`
- `GET /api/article-plans/:id`

The `generate-plan` response returns:

- the plan
- whether it was skipped
- whether it was regenerated
- a summary message

## Frontend additions

### Opportunities page

- `Generate plan` action per row
- row-level loading feedback
- success summary after generation

### Article Plans page

- table view of generated plans
- filters for website, status, and intent
- plan detail panel with:
  - brief
  - secondary keywords
  - source opportunity
  - related website

## Out of scope

Phase 3 does not yet improve full draft writing quality.

The goal here is to make the planning layer strong enough that draft generation can become a separate, cleaner phase.
