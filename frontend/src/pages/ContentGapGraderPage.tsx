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
          <p>
            Content Gap Grader scans your website, estimates where your blog coverage is weak, and surfaces the
            fastest article ideas to fix it.
          </p>

          <ContentGapGraderForm
            value={url}
            onChange={setUrl}
            onSubmit={handleSubmit}
            ctaLabel="Grade my content gaps"
          />

          <div className="grader-proof-row">
            <span>Instant score breakdown</span>
            <span>Top 5 missing opportunities</span>
            <span>Shareable result link</span>
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
              <h2>Plenty of room to grow blog support content</h2>
              <p>Strong service positioning, but weak blog momentum and several high-value topics still uncovered.</p>
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
          <h2>Fast enough for a lead magnet, useful enough to act on</h2>
        </div>

        <div className="grader-feature-grid">
          <article className="grader-feature">
            <strong>1. Scan the website</strong>
            <p>We inspect the homepage and key supporting paths to understand topic coverage and blog support signals.</p>
          </article>
          <article className="grader-feature">
            <strong>2. Score the gaps</strong>
            <p>Heuristic scoring estimates how much content depth, momentum, commercial coverage, and freshness is missing.</p>
          </article>
          <article className="grader-feature">
            <strong>3. Show what to publish next</strong>
            <p>Get missing topic opportunities plus quick-win article ideas that can be turned into real plans and drafts.</p>
          </article>
        </div>
      </section>

      <section className="grader-section alt">
        <div className="section-intro">
          <span className="eyebrow">What you get</span>
          <h2>A simple report that makes the gap obvious</h2>
        </div>

        <div className="grader-score-grid">
          <article className="grader-score-card">
            <span className="eyebrow">Coverage</span>
            <strong>Content Coverage Score</strong>
            <p>How well the current site supports its niche with educational content.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Momentum</span>
            <strong>Blog Momentum Score</strong>
            <p>Whether the site appears to have a real publishing engine or just a handful of static pages.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Intent</span>
            <strong>Commercial Intent Coverage</strong>
            <p>How well the site connects educational content to actual buying or service intent.</p>
          </article>
          <article className="grader-score-card">
            <span className="eyebrow">Freshness</span>
            <strong>Freshness Score</strong>
            <p>Signals that suggest the website is still publishing, updating, and expanding its content footprint.</p>
          </article>
        </div>
      </section>

      <section className="grader-upsell">
        <div>
          <span className="eyebrow">Next step</span>
          <h2>Want to fix these gaps automatically?</h2>
          <p>Generate article plans and drafts with Autoblog Agent instead of managing the workflow manually.</p>
        </div>
        <div className="hero-actions">
          <Link className="button" to="/app/dashboard">
            Open Autoblog Agent
          </Link>
          <button className="button secondary" onClick={handleSubmit}>
            Try the free grader
          </button>
        </div>
      </section>
    </div>
  );
}
