# Phase 5: Export Center

Phase 5 turns reviewable draft objects into reliable local article packages.

## Goal

Allow a generated draft to be exported into a deterministic filesystem package that can be used outside the app.

## Included in this phase

- Export a draft into a structured package on the local filesystem
- Load draft, article plan, website, and source opportunity context before export
- Write a stable bundle of markdown, HTML, metadata, SEO data, and planning context
- Persist export jobs while avoiding duplicate export rows unless re-exporting
- Expose export listing and export detail endpoints
- Add export actions directly from the Drafts page
- Add a dedicated Exports page with filters and a detail panel

## Export package contents

Each package includes:

- `article.md`
- `content.html`
- `metadata.json`
- `seo.json`
- `brief.json`

## File responsibilities

### article.md

- markdown article body

### content.html

- HTML article body
- falls back to markdown-derived HTML if stored HTML is missing

### metadata.json

- draft id
- article plan id
- website id
- website name
- title
- slug
- status
- exported timestamp

### seo.json

- meta title
- meta description
- target keyword
- secondary keywords
- FAQ
- internal links
- readiness score

### brief.json

- title
- angle
- CTA
- search intent
- brief
- source opportunity details when available

## Filesystem structure

Exports use a deterministic path structure:

- `backend/output/{website-slug}/{draft-slug}/`

This keeps exports stable for the same draft and makes future CMS connectors easier to build.

## Duplicate handling

Exports are unique per draft by default.

- if an export already exists for the draft and re-export is not requested, the API returns the existing export job as skipped
- if re-export is requested, the existing export job is updated and the package files are overwritten in place

## API additions

- `POST /api/drafts/:id/export`
- `GET /api/exports`
- `GET /api/exports/:id`

The export response includes:

- export job
- export path
- exported files
- skipped flag
- regenerated flag
- summary message

## Frontend additions

### Drafts page

- per-row `Export` action
- row-level loading feedback
- success feedback after export

### Exports page

- filters by website and status
- export table with path and linked article information
- detail panel showing:
  - exported files
  - export path
  - linked draft
  - linked article plan
  - linked website

## Out of scope

Phase 5 does not include:

- publishing to WordPress
- publishing to other CMS platforms
- billing

The focus is only on producing reliable export packages from structured draft objects.
