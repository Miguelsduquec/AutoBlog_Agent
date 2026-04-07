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
- Email/password authentication
- Google sign-in
- Subscription-gated app access
- Stripe checkout session and webhook support
- Core docs

The main focus is now the workflow from website analysis to opportunities to article plans to structured draft objects, export packages, and manually triggered automation runs.

## What it includes

- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript backend
- SQLite MVP data layer with seed data
- Website analysis, SEO audit, analysis-based opportunity generation, plan generation, draft generation, automation runs, and export packaging
- Paid-only app access with login plus subscription gating
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

### Demo account

If you seeded the demo database, you can log in with:

- Email: `demo@autoblog-agent.local`
- Password: `demo12345`

`BILLING_MODE=mock` keeps local checkout simple. In production, do not leave billing in mock mode.

For two paid plans, set these Stripe Price IDs in `.env`:

- `STRIPE_PRICE_ID_MONTHLY=price_...`
- `STRIPE_PRICE_ID_YEARLY=price_...`
- `STRIPE_SECRET_KEY=sk_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_CHECKOUT_SUCCESS_URL=https://your-app.com/pricing?checkout=success`
- `STRIPE_CHECKOUT_CANCEL_URL=https://your-app.com/pricing?checkout=cancelled`

`STRIPE_PRICE_ID` still works as a monthly fallback, but the preferred setup is one monthly price ID plus one yearly price ID.

Monthly and yearly mapping:

- `monthly` -> `STRIPE_PRICE_ID_MONTHLY`
- `yearly` -> `STRIPE_PRICE_ID_YEARLY`

Google sign-in runs in local mock mode by default with the sample `.env.example`. For real Google OAuth, set:

- `GOOGLE_AUTH_MODE=live`
- `GOOGLE_CLIENT_ID=your-google-client-id`
- `VITE_GOOGLE_AUTH_MODE=live`
- `VITE_GOOGLE_CLIENT_ID=your-google-client-id`

## Build

```bash
npm run build
```

## Stripe modes

Local development:

- keep `BILLING_MODE=mock`
- checkout activates locally so the paid funnel is easy to test

Live / production:

- set `BILLING_MODE=stripe`
- set `STRIPE_SECRET_KEY`
- set `STRIPE_PRICE_ID_MONTHLY`
- set `STRIPE_PRICE_ID_YEARLY`
- set `STRIPE_WEBHOOK_SECRET`
- set `STRIPE_CHECKOUT_SUCCESS_URL`
- set `STRIPE_CHECKOUT_CANCEL_URL`

The frontend never receives Stripe secrets. It only sends the selected billing plan to the backend.

## Stripe webhook setup

Required events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Local webhook testing with Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Then copy the signing secret printed by Stripe CLI into:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
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
- The free Content Gap Grader stays public, but the app itself now requires login plus an active subscription.
- In local mock billing mode, checkout activates the subscription immediately so the paid flow remains testable without real Stripe keys.
- In live Stripe mode, the backend creates Checkout Sessions in subscription mode and verifies webhooks against the raw request body plus `STRIPE_WEBHOOK_SECRET`.
- Credentials are stored in SQLite:
  - user emails in `users.email`
  - password hashes in `users.password_hash`
  - Google account ids in `users.google_sub`
- Passwords are not stored in plaintext. Local-password accounts use Node's built-in `crypto.scryptSync` with a random 16-byte salt, stored as `salt:hash`.
- Google-only accounts store `users.password_hash` as `NULL`, not an empty string, and password login is blocked for those accounts.
- The crawler, website analysis, opportunity generation, article planning, draft generation, automation orchestration, and export services are modular mock implementations so real AI providers or CMS integrations can replace them later without changing the product workflow.
- Export packages are written to `backend/output`.
- Automation runs are synchronous in this MVP and are intentionally structured so queues or background workers can be added later.
