# Phase 4: Draft Generation

Phase 4 turns structured article plans into publication-oriented draft objects.

## Goal

Generate a strong draft package from each `ArticlePlan` before any publishing workflow exists.

## Included in this phase

- Generate a draft from a single article plan
- Load website context and latest analysis before writing
- Build outline, markdown, HTML, metadata, FAQ, internal links, slug, and readiness score
- Persist drafts without creating duplicates for the same plan unless regeneration is requested
- Expose draft generation and draft detail endpoints
- Add a dedicated Drafts page with filters and a detail panel

## Draft inputs

The generator uses:

- article plan title
- target keyword
- secondary keywords
- search intent
- angle
- CTA
- brief
- website niche and tone
- latest website analysis summary and extracted keywords
- website pages for internal link suggestions

## Generated draft fields

Each `Draft` includes:

- `outlineJson`
- `articleMarkdown`
- `articleHtml`
- `slug`
- `metaTitle`
- `metaDescription`
- `faqJson`
- `internalLinksJson`
- `readinessScore`
- `status`

## Generator behavior

The current generator is heuristic-based and modular.

- the outline includes an intro, practical middle sections, and a conclusion
- the markdown article uses the plan angle and website context to keep tone aligned
- HTML is derived from markdown in the backend
- SEO metadata is generated from the title, keyword, and website context
- FAQ items are created when the topic benefits from additional explanation
- internal links are suggested from relevant website pages using simple keyword overlap

## Duplicate handling

Drafts are unique per article plan by default.

- if a draft already exists and regeneration is not requested, the API returns the existing draft as skipped
- if regeneration is requested, the existing draft row is updated instead of duplicating it

## API additions

- `POST /api/article-plans/:id/generate-draft`
- `GET /api/drafts`
- `GET /api/drafts/:id`

The generation response includes:

- the draft
- skipped flag
- regenerated flag
- summary message

## Readiness scoring

The readiness score is heuristic and increases when:

- title, keyword, and article body are aligned
- meta title and meta description exist
- FAQ exists
- internal links exist
- the article has enough structure and length

Draft status is derived from readiness:

- stronger drafts move directly to `review`
- weaker drafts stay in `drafting`

## Frontend additions

### Article Plans page

- `Generate draft` action per row
- row-level loading feedback
- success summary after draft generation

### Drafts page

- filters by website, status, and readiness range
- table with draft overview data
- detail panel for:
  - outline
  - markdown
  - HTML preview
  - slug
  - meta title
  - meta description
  - FAQ
  - internal link suggestions

## Out of scope

Phase 4 does not include:

- auto-publishing
- billing
- production LLM integration

The focus is only on creating strong, reviewable draft objects from article plans.
