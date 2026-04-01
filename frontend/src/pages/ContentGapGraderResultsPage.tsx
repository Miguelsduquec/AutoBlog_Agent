import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ContentGapGraderForm } from "../components/ContentGapGraderForm";
import { GlobalHeader } from "../components/GlobalHeader";
import { StatusBadge } from "../components/StatusBadge";
import { usePageMeta } from "../hooks/usePageMeta";
import { ContentGapGraderReport } from "../types";

function shareUrlFor(websiteUrl: string): string {
  return `${window.location.origin}/tools/content-gap-grader/results?url=${encodeURIComponent(websiteUrl)}`;
}

function scoreLabel(score: number): string {
  if (score >= 80) {
    return "Strong";
  }
  if (score >= 65) {
    return "Promising";
  }
  if (score >= 50) {
    return "Underbuilt";
  }
  return "Wide open";
}

export function ContentGapGraderResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedUrl = searchParams.get("url") ?? "";
  const [urlInput, setUrlInput] = useState(requestedUrl);
  const [report, setReport] = useState<ContentGapGraderReport | null>(null);
  const [loading, setLoading] = useState(Boolean(requestedUrl));
  const [error, setError] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");

  const metaTitle = report
    ? `${report.websiteName} Content Gap Score: ${report.scores.overallScore}/100 | Content Gap Grader`
    : "Content Gap Grader Results | Free Website Content Gap Checker";
  const metaDescription = report
    ? `Analyze ${report.websiteName}'s content coverage, blog momentum, topic gaps, and quick-win article ideas.`
    : "See how much blog opportunity a website is missing with Content Gap Grader.";

  usePageMeta(metaTitle, metaDescription);

  useEffect(() => {
    setUrlInput(requestedUrl);
  }, [requestedUrl]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!requestedUrl) {
        setLoading(false);
        setReport(null);
        return;
      }

      setLoading(true);
      setError("");
      setShareFeedback("");

      try {
        const nextReport = await api.gradeContentGaps(requestedUrl);
        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (nextError) {
        if (!cancelled) {
          setReport(null);
          setError(nextError instanceof Error ? nextError.message : "Unable to analyze this website.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [requestedUrl]);

  const shareUrl = useMemo(() => shareUrlFor(report?.websiteUrl ?? requestedUrl), [report?.websiteUrl, requestedUrl]);
  const scoreStyle = report ? ({ "--score": report.scores.overallScore } as CSSProperties) : undefined;

  function handleSubmit() {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      return;
    }

    navigate(`/tools/content-gap-grader/results?url=${encodeURIComponent(trimmed)}`);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setShareFeedback("Link copied.");
  }

  async function handleShare() {
    if (!report) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `Content Gap Score for ${report.websiteName}`,
        text: report.shareMessage,
        url: shareUrl
      });
      setShareFeedback("Share sheet opened.");
      return;
    }

    await navigator.clipboard.writeText(`${report.shareMessage} ${shareUrl}`);
    setShareFeedback("Share text copied.");
  }

  return (
    <div className="grader-page">
      <GlobalHeader inApp />

      <section className="grader-results-shell">
        <div className="grader-results-top">
          <div>
            <span className="eyebrow">Free report</span>
            <h1>Content Gap Grader results</h1>
            <p>Analyze a website, share the score, and turn the gap list into an Autoblog Agent workflow.</p>
          </div>

          <ContentGapGraderForm
            value={urlInput}
            onChange={setUrlInput}
            onSubmit={handleSubmit}
            submitting={loading}
            ctaLabel="Run a new check"
            compact
          />
        </div>

        {loading ? (
          <div className="grader-loading">
            <div className="grader-loading-copy">
              <span className="eyebrow">Analyzing website</span>
              <h2>Scanning content coverage and blog support signals</h2>
              <p>We are inspecting the website structure, extracting topic signals, and estimating the clearest gaps.</p>
            </div>
            <div className="grader-loader-rail">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="state-card error">
            <strong>Unable to grade this website right now.</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && !error && !report ? (
          <div className="state-card">
            <strong>Enter a website URL to generate a content gap report.</strong>
          </div>
        ) : null}

        {!loading && report ? (
          <div className="page-stack">
            <section className="grader-report-hero">
              <div className="grader-report-score">
                <div className="grader-score-ring large" style={scoreStyle}>
                  <strong>{report.scores.overallScore}</strong>
                  <span>{report.scores.gradeLabel} grade</span>
                </div>

                <div className="grader-score-summary">
                  <span className="eyebrow">{report.websiteName}</span>
                  <h2>{scoreLabel(report.scores.overallScore)} content foundation</h2>
                  <p>{report.overview}</p>
                  <div className="pill-row">
                    <span className="mini-pill">{report.hostname}</span>
                    <span className="mini-pill">{report.analyzedPageCount} pages analyzed</span>
                    <span className="mini-pill">{report.extractedKeywords.length} extracted keywords</span>
                    <span className="mini-pill">
                      {report.analysisConfidenceLevel} confidence • {report.analysisConfidenceScore}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className="grader-report-actions">
                <button className="button" onClick={() => void handleShare()}>
                  Share score
                </button>
                <button className="button secondary" onClick={() => void handleCopyLink()}>
                  Copy link
                </button>
                <Link className="button secondary" to="/app/dashboard">
                  Upgrade to Autoblog Agent
                </Link>
                {shareFeedback ? <span className="muted-copy">{shareFeedback}</span> : null}
              </div>
            </section>

            <div className="grader-results-grid">
              <article className="metric-card">
                <div className="metric-label">Content Coverage Score</div>
                <div className="metric-value">{report.scores.contentCoverageScore}</div>
                <div className="metric-help">How much educational support content the site appears to have.</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Blog Momentum Score</div>
                <div className="metric-value">{report.scores.blogMomentumScore}</div>
                <div className="metric-help">Whether the site looks like it is publishing consistently or standing still.</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Topic Gap Count</div>
                <div className="metric-value">{report.scores.topicGapCount}</div>
                <div className="metric-help">Estimated number of clear article opportunities still missing.</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Commercial Intent Coverage</div>
                <div className="metric-value">{report.scores.commercialIntentCoverage}</div>
                <div className="metric-help">How well the site connects content to real buying and service intent.</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Freshness Score</div>
                <div className="metric-value">{report.scores.freshnessScore}</div>
                <div className="metric-help">Signals that suggest the site is still expanding and updating its content.</div>
              </article>
            </div>

            {report.analysisConfidenceLevel !== "high" ? (
              <div className={`state-card ${report.analysisConfidenceLevel === "low" ? "warning" : ""}`}>
                <strong>{report.analysisConfidenceLevel === "low" ? "Low-confidence scan" : "Medium-confidence scan"}</strong>
                <p>
                  {report.analysisConfidenceLevel === "low"
                    ? "This website exposed limited crawlable content, so this report should be treated as directional rather than definitive."
                    : "This report is useful, but it is based on partial website signals rather than a fully rich content footprint."}
                </p>
              </div>
            ) : null}

            <div className="grader-detail-grid">
              <section className="section-card">
                <div className="section-header">
                  <div>
                    <span className="eyebrow">What we saw</span>
                    <h2>Website readout</h2>
                  </div>
                </div>
                <p className="detail-summary">{report.nicheSummary}</p>
                <div className="pill-row">
                  {report.extractedKeywords.map((keyword) => (
                    <span className="mini-pill" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="stack-list">
                  {report.analyzedPages.map((page) => (
                    <article className="list-card" key={page.url}>
                      <div className="list-card-top">
                        <strong>{page.title}</strong>
                        <StatusBadge value={page.pageType} />
                      </div>
                      <p>{page.url}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="section-card">
                <div className="section-header">
                  <div>
                    <span className="eyebrow">Top 5 missing opportunities</span>
                    <h2>Where coverage is most obviously missing</h2>
                  </div>
                </div>
                <div className="stack-list">
                  {report.topMissingOpportunities.map((idea, index) => (
                    <article className="list-card" key={`${idea.keyword}-${index}`}>
                      <div className="list-card-top">
                        <strong>{idea.topic}</strong>
                        <div className="row-actions">
                          <StatusBadge value={idea.intent} />
                          <StatusBadge value={idea.priority} />
                        </div>
                      </div>
                      <p>{idea.whyItMatters}</p>
                      <div className="pill-row">
                        <span className="mini-pill">Keyword: {idea.keyword}</span>
                        <span className="mini-pill">Cluster: {idea.cluster}</span>
                        <span className="mini-pill">Relevance: {idea.relevanceScore}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="section-card">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Top 3 quick wins</span>
                  <h2>Article ideas you could act on first</h2>
                </div>
              </div>

              <div className="grader-quickwins">
                {report.quickWinIdeas.map((idea, index) => (
                  <article className="grader-quickwin-card" key={`${idea.keyword}-${index}`}>
                    <div className="list-card-top">
                      <strong>{idea.topic}</strong>
                      <StatusBadge value={idea.estimatedDifficulty} />
                    </div>
                    <p>{idea.whyItMatters}</p>
                    <div className="pill-row">
                      <span className="mini-pill">{idea.intent}</span>
                      <span className="mini-pill">{idea.priority} priority</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grader-upsell">
              <div>
                <span className="eyebrow">Autoblog Agent</span>
                <h2>Want to fix these gaps automatically?</h2>
                <p>Generate article plans and drafts with Autoblog Agent instead of managing the content workflow by hand.</p>
              </div>
              <div className="hero-actions">
                <Link className="button" to="/app/dashboard">
                  Generate plans and drafts
                </Link>
                <Link className="button secondary" to="/tools/content-gap-grader">
                  Run another website
                </Link>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
