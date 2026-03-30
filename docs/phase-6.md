# Phase 6: Automation Runs

Phase 6 introduces the first real automation layer for Autoblog Agent.

## Goal

Allow a website owner to trigger a multi-step content workflow in one action, while keeping the execution readable, logged, and safe for human review.

## Included in this phase

- Add a synchronous automation orchestrator for website-level workflows
- Persist automation runs with structured logs and summary counts
- Support three run types:
  - `analyze-only`
  - `opportunities-only`
  - `full-pipeline`
- Reuse the existing services for:
  - website analysis
  - opportunity generation
  - article plan generation
  - draft generation
  - optional export creation
- Avoid duplicate plans, drafts, and exports by relying on the existing duplicate-safe service layer
- Add manual automation controls on the Website Detail page
- Add an Automation Runs page with filters and run detail inspection

## Workflow behavior

### analyze-only

- load the website
- run website analysis
- save the analysis run
- complete the automation run with logs and summary data

### opportunities-only

- load the website
- reuse the latest analysis when available
- run analysis first if none exists
- generate opportunities when needed
- persist created opportunities and skip obvious duplicates

### full-pipeline

- load the website
- ensure analysis exists, or run it if missing
- generate opportunities when the unplanned pool is below the requested threshold
- choose up to `N` opportunities that do not already have plans
- create plans for the selected opportunities
- optionally generate drafts for those plans
- optionally export the resulting drafts

## Automation run model

Each `AutomationRun` now stores:

- `id`
- `websiteId`
- `runType`
- `status`
- `logsJson`
- `outputSummary`
- `createdAt`
- `updatedAt`

## Summary payload

`outputSummary` is a structured object so the UI can show meaningful operational detail:

- `analysisCreated`
- `opportunitiesCreated`
- `plansCreated`
- `draftsCreated`
- `exportsCreated`
- `skippedItems`
- `errors`
- `outputIds`
- `message`

This makes the automation layer ready for future background jobs or queue workers without changing the product contract.

## API additions

- `POST /api/websites/:id/run-automation`
- `GET /api/automation-runs`
- `GET /api/automation-runs/:id`

Example request body:

```json
{
  "runType": "full-pipeline",
  "maxOpportunities": 5,
  "generateDrafts": true,
  "exportDrafts": false
}
```

## Frontend additions

### Website Detail page

- new `Run Automation` action
- small inline control panel with:
  - run type
  - max opportunities
  - generate drafts yes/no
  - export drafts yes/no

### Automation Runs page

- filters by website, status, and run type
- run history table
- detail panel with:
  - logs
  - structured counts
  - linked opportunities
  - linked plans
  - linked drafts
  - linked exports

## Design intent

This phase does not try to hide the workflow behind a generic AI prompt box.

The UI stays operational:

- websites remain the unit of automation
- runs are explicit and inspectable
- logs explain what happened
- outputs are visible
- human review still exists before publishing

## Out of scope

Phase 6 does not include:

- cron scheduling
- background workers
- queues
- CMS publishing
- billing

The focus is a manually triggered, end-to-end automation workflow that proves the core product promise.
