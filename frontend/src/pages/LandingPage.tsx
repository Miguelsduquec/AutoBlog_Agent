import { Link } from "react-router-dom";
import { GlobalHeader } from "../components/GlobalHeader";

export function LandingPage() {
  return (
    <div className="landing-page">
      <GlobalHeader />

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Generate blog articles automatically</span>
          <h1>Generate blog articles automatically for your website</h1>
          <p>Analyze the site, find the gaps, and turn them into ready-to-review drafts.</p>
          <div className="hero-actions">
            <Link className="button" to="/tools/content-gap-grader">
              Try the free grader
            </Link>
            <a className="button secondary" href="#problem">
              See the workflow
            </a>
          </div>
          <div className="hero-meta">
            <span>Website-first analysis</span>
            <span>Review before export</span>
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
              <p>Microsoft consulting for SMB teams</p>
              <div className="mini-pill-row">
                <span className="mini-pill">Teams governance</span>
                <span className="mini-pill">SharePoint</span>
                <span className="mini-pill">Migration</span>
              </div>
            </div>
            <div className="shot-panel">
              <div className="shot-label">Top opportunity</div>
              <h3>Month-end close automation software</h3>
              <p>High priority • Plan ready</p>
            </div>
            <div className="shot-panel">
              <div className="shot-label">Draft studio</div>
              <h3>Readiness score: 91</h3>
              <p>Meta, FAQ, links, and export package ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="problem">
        <div className="section-intro">
          <span className="eyebrow">Problem</span>
          <h2>Most AI writing tools skip the part that actually matters</h2>
          <p>Most tools start with a prompt. Autoblog Agent starts with the website.</p>
        </div>
        <div className="feature-grid three">
          <article className="feature-card">
            <h3>No website context</h3>
            <p>No business context first.</p>
          </article>
          <article className="feature-card">
            <h3>No operational workflow</h3>
            <p>No clear pipeline from analysis to draft.</p>
          </article>
          <article className="feature-card">
            <h3>No repeatable publishing engine</h3>
            <p>No repeatable publishing loop.</p>
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
            "Add a website.",
            "Analyze the core pages.",
            "Find missed article opportunities.",
            "Turn them into plans.",
            "Generate review-ready drafts.",
            "Export for publishing."
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
            <p>Read the site before writing.</p>
          </article>
          <article className="feature-card">
            <h3>SEO opportunity engine</h3>
            <p>Find the missing topics.</p>
          </article>
          <article className="feature-card">
            <h3>Article plans and drafts</h3>
            <p>Go from idea to draft fast.</p>
          </article>
          <article className="feature-card">
            <h3>Automation run visibility</h3>
            <p>See what ran and what was created.</p>
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
          <h2>Simple launch pricing</h2>
          <p>One monthly plan for the full workflow.</p>
        </div>
        <div className="pricing-card">
          <h3>Starter</h3>
          <div className="pricing-value">€99<span>/month</span></div>
          <p>Websites, analysis, opportunities, plans, drafts, exports, and automation.</p>
          <Link className="button" to="/pricing">
            View pricing
          </Link>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Turn website knowledge into continuous article generation</h2>
        <p>Start with the free score.</p>
        <Link className="button" to="/tools/content-gap-grader">
          Start with the free grader
        </Link>
      </section>
    </div>
  );
}
