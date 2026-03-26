import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark">A</span>
          <span>Autoblog Agent</span>
        </div>
        <div className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link className="button secondary" to="/app/dashboard">
            Open app
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Generate blog articles automatically</span>
          <h1>Generate blog articles automatically for your website</h1>
          <p>
            Autoblog Agent analyzes your niche, finds relevant topics, and creates publication-ready blog
            posts automatically.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/app/dashboard">
              Launch the product
            </Link>
            <a className="button secondary" href="#problem">
              See the workflow
            </a>
          </div>
          <div className="hero-meta">
            <span>Website-first analysis</span>
            <span>SEO opportunity discovery</span>
            <span>Human review before export</span>
          </div>
        </div>

        <div className="product-shot">
          <div className="shot-toolbar">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span className="shot-title">Autoblog Agent workspace</span>
          </div>
          <div className="shot-grid">
            <div className="shot-panel wide">
              <div className="shot-label">Website analysis</div>
              <h3>Polped</h3>
              <p>Microsoft consulting for SMB productivity and collaboration rollouts</p>
              <div className="mini-pill-row">
                <span className="mini-pill">Teams governance</span>
                <span className="mini-pill">SharePoint</span>
                <span className="mini-pill">Migration</span>
              </div>
            </div>
            <div className="shot-panel">
              <div className="shot-label">Top opportunity</div>
              <h3>Month-end close automation software</h3>
              <p>Commercial intent • High priority • Plan ready</p>
            </div>
            <div className="shot-panel">
              <div className="shot-label">Draft studio</div>
              <h3>Readiness score: 91</h3>
              <p>Metadata, FAQ, internal links, and export package prepared.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="problem">
        <div className="section-intro">
          <span className="eyebrow">Problem</span>
          <h2>Most AI writing tools skip the part that actually matters</h2>
          <p>
            Generic AI writers start with a blank prompt. Autoblog Agent starts with the website, the niche,
            the existing content profile, and the SEO gaps that are holding growth back.
          </p>
        </div>
        <div className="feature-grid three">
          <article className="feature-card">
            <h3>No website context</h3>
            <p>Generic writing tools do not understand the business, service pages, or conversion paths first.</p>
          </article>
          <article className="feature-card">
            <h3>No operational workflow</h3>
            <p>They rarely organize analysis, opportunity discovery, planning, drafting, and review as one system.</p>
          </article>
          <article className="feature-card">
            <h3>No repeatable publishing engine</h3>
            <p>Teams need ongoing generation with review gates, not a one-off assistant shell.</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="section-intro">
          <span className="eyebrow">How it works</span>
          <h2>A real workflow for continuous blog production</h2>
        </div>
        <div className="steps-grid">
          {[
            "Add a website manually and define niche, tone, market, and publishing cadence.",
            "Crawl and analyze the website to infer content pillars, coverage, and page signals.",
            "Run a lightweight SEO and content audit to identify structural gaps and support needs.",
            "Discover article opportunities that match the niche and current website profile.",
            "Convert opportunities into article plans and publication-ready drafts automatically.",
            "Review drafts, regenerate sections if needed, and export a package for publishing."
          ].map((step, index) => (
            <article className="step-card" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="section-intro">
          <span className="eyebrow">Core features</span>
          <h2>Built for operators who need clarity, not novelty</h2>
        </div>
        <div className="feature-grid two">
          <article className="feature-card">
            <h3>Website-first analysis</h3>
            <p>Inspect key pages, extract metadata and headings, infer niche, and map content pillars.</p>
          </article>
          <article className="feature-card">
            <h3>SEO opportunity engine</h3>
            <p>Identify missing support content, topic gaps, internal linking opportunities, and priority clusters.</p>
          </article>
          <article className="feature-card">
            <h3>Article plans and drafts</h3>
            <p>Turn opportunities into briefs, outlines, metadata, FAQ sections, and review-ready drafts.</p>
          </article>
          <article className="feature-card">
            <h3>Automation run visibility</h3>
            <p>Track queued, running, completed, or failed generation runs with logs and output summaries.</p>
          </article>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="section-intro">
          <span className="eyebrow">Why it is different</span>
          <h2>Autoblog Agent is not a generic AI writer</h2>
        </div>
        <div className="comparison-card">
          <div>
            <h3>Generic AI writer</h3>
            <ul>
              <li>Starts with prompts</li>
              <li>Little website understanding</li>
              <li>One-off drafting</li>
              <li>Weak SEO workflow</li>
            </ul>
          </div>
          <div>
            <h3>Autoblog Agent</h3>
            <ul>
              <li>Starts with the website and niche</li>
              <li>Finds opportunities from content gaps</li>
              <li>Operates a repeatable draft pipeline</li>
              <li>Keeps a review step before publishing</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="section-intro">
          <span className="eyebrow">Pricing</span>
          <h2>Monetizable from v1, flexible later</h2>
          <p>Placeholder pricing for launch. Billing and usage limits can be layered in when the product is ready.</p>
        </div>
        <div className="pricing-card">
          <h3>Starter</h3>
          <div className="pricing-value">€99<span>/month</span></div>
          <p>Up to 3 websites, ongoing opportunity discovery, article plans, drafts, and export packaging.</p>
          <Link className="button" to="/app/dashboard">
            Explore the MVP
          </Link>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Turn website knowledge into continuous article generation</h2>
        <p>Use Autoblog Agent to analyze, prioritize, draft, review, and export blog content in one workflow.</p>
        <Link className="button" to="/app/dashboard">
          Open Autoblog Agent
        </Link>
      </section>
    </div>
  );
}
