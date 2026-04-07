import { CSSProperties, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ContentGapGraderForm } from "../components/ContentGapGraderForm";
import { GlobalHeader } from "../components/GlobalHeader";
import { usePageMeta } from "../hooks/usePageMeta";

const META_TITLE = "Content Gap Grader | Free Website Content Gap Checker";
const META_DESCRIPTION =
  "Analyze any website and instantly see content coverage, blog momentum, topic gaps, and quick-win article ideas.";

export function ContentGapGraderPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const previewScoreStyle = { "--score": 62 } as CSSProperties;

  usePageMeta(META_TITLE, META_DESCRIPTION);

  function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    navigate(`/tools/content-gap-grader/results?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="grader-page">
      <GlobalHeader inApp />

      <section className="grader-hero">
        <div className="grader-hero-copy">
          <span className="eyebrow">Free content gap tool</span>
          <h1>See how much content opportunity your website is missing</h1>
          <p>Paste a URL and get a simple content gap score with fast topic ideas.</p>

          <ContentGapGraderForm
            value={url}
            onChange={setUrl}
            onSubmit={handleSubmit}
            ctaLabel="Grade my content gaps"
          />

          <div className="grader-proof-row">
            <span>Fast score</span>
            <span>Missing topics</span>
            <span>Quick wins</span>
          </div>
        </div>

        <div className="grader-visual">
          <div className="grader-score-preview">
            <div className="grader-score-ring" style={previewScoreStyle}>
              <strong>62</strong>
              <span>Coverage score</span>
            </div>
            <div className="grader-preview-copy">
              <div className="eyebrow">Example output</div>
              <h2>Clear room to grow</h2>
              <p>Strong service pages. Weak blog support.</p>
            </div>
          </div>

          <div className="grader-preview-list">
            {[
              "How Power Automate helps finance teams reduce manual work",
              "Common Microsoft 365 governance mistakes for SMBs",
              "Best internal knowledge base setup for fast-growing teams"
            ].map((item) => (
              <div className="grader-preview-item" key={item}>
                <span className="grader-preview-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grader-section">
        <div className="section-intro">
          <span className="eyebrow">How it works</span>
          <h2>Three quick steps</h2>
        </div>

        <div className="grader-feature-grid">
          <article className="grader-feature">
            <strong>1. Scan the website</strong>
            <p>Read the key pages.</p>
          </article>
          <article className="grader-feature">
            <strong>2. Score the gaps</strong>
            <p>Score coverage and momentum.</p>
          </article>
          <article className="grader-feature">
            <strong>3. Show what to publish next</strong>
            <p>Show the next topics to write.</p>
          </article>
        </div>
      </section>

      <section className="grader-section alt">
        <div className="section-intro">
          <span className="eyebrow">What you get</span>
          <h2>A report you can scan fast</h2>
        </div>

        <div className="grader-score-grid">
          <article className="grader-score-card">
            <span className="eyebrow">Coverage</span>
            <strong>Content Coverage Score</strong>
            <p>How much useful support content exists.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Momentum</span>
            <strong>Blog Momentum Score</strong>
            <p>How active the site looks.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Intent</span>
            <strong>Commercial Intent Coverage</strong>
            <p>How well content supports buying intent.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Freshness</span>
            <strong>Freshness Score</strong>
            <p>Whether content looks current.</p>
          </article>
        </div>
      </section>

      <section className="grader-upsell">
        <div>
          <span className="eyebrow">Next step</span>
          <h2>Want to fix these gaps automatically?</h2>
          <p>Use Autoblog Agent with a paid subscription to generate plans, drafts, and exports.</p>
        </div>
        <div className="hero-actions">
          <Link className="button" to="/pricing">
            Use Autoblog Agent with a paid subscription
          </Link>
          <button className="button secondary" data-testid="grader-secondary-submit" onClick={handleSubmit}>
            Try the free grader
          </button>
        </div>
      </section>
    </div>
  );
}
