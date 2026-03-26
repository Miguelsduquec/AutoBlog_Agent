import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAsyncData } from "../hooks/useAsyncData";
import { formatDate } from "../utils/format";

export function WebsiteDetailPage() {
  const { websiteId = "" } = useParams();
  const detailQuery = useAsyncData(() => api.getWebsiteDetail(websiteId), [websiteId]);
  const [activeAction, setActiveAction] = useState<string>("");

  async function runAction(actionKey: string, task: () => Promise<unknown>) {
    setActiveAction(actionKey);
    try {
      await task();
      await detailQuery.refresh();
    } finally {
      setActiveAction("");
    }
  }

  if (detailQuery.loading) {
    return <div className="state-card">Loading website detail…</div>;
  }

  if (detailQuery.error || !detailQuery.data) {
    return <div className="state-card error">Unable to load the selected website.</div>;
  }

  const { website, latestAnalysis, latestAudit, latestDrafts, latestOpportunities, pages } = detailQuery.data;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">Website workspace</div>
          <h1>{website.name}</h1>
          <p>
            {website.niche} • {website.language} • {website.targetCountry}
          </p>
        </div>
        <div className="toolbar-controls">
          <button className="button secondary" onClick={() => runAction("analyze", () => api.analyzeWebsite(website.id))}>
            {activeAction === "analyze" ? "Analyzing…" : "Run analysis"}
          </button>
          <button className="button secondary" onClick={() => runAction("audit", () => api.runSeoAudit(website.id))}>
            {activeAction === "audit" ? "Auditing…" : "Run SEO audit"}
          </button>
          <button
            className="button"
            onClick={() =>
              runAction("automation", () => api.triggerAutomationRun(website.id, "manual-detail-run", 2))
            }
          >
            {activeAction === "automation" ? "Running…" : "Start automation run"}
          </button>
        </div>
      </div>

      <div className="metrics-grid three-up">
        <MetricCard title="Pages analyzed" value={pages.length} help="Tracked key pages in the website profile" />
        <MetricCard title="Latest audit score" value={latestAudit?.score ?? "Not run"} help="SEO and content health snapshot" />
        <MetricCard
          title="Latest drafts"
          value={latestDrafts.length}
          help="Most recent draft count in the website workflow"
        />
      </div>

      <div className="grid-two">
        <SectionCard title="Summary" description="Core context used by the system to generate niche-relevant content.">
          <div className="detail-list">
            <div>
              <strong>Domain</strong>
              <span>{website.domain}</span>
            </div>
            <div>
              <strong>Brand tone</strong>
              <span>{website.tone}</span>
            </div>
            <div>
              <strong>Content goal</strong>
              <span>{website.contentGoal}</span>
            </div>
            <div>
              <strong>Publishing frequency</strong>
              <span>{website.publishingFrequency}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Content pillars" description="Latest inferred clusters from website analysis.">
          <div className="pill-row">
            {(latestAnalysis?.contentPillarsJson ?? []).map((pillar) => (
              <span className="mini-pill" key={pillar}>
                {pillar}
              </span>
            ))}
          </div>
          <p className="detail-summary">{latestAnalysis?.nicheSummary ?? "No analysis summary yet."}</p>
        </SectionCard>
      </div>

      <div className="grid-two">
        <SectionCard title="Latest audit" description="Most recent SEO and content audit findings.">
          {latestAudit ? (
            <div className="stack-list">
              <div className="score-banner">
                <span>Score</span>
                <strong>{latestAudit.score}</strong>
              </div>
              {latestAudit.findingsJson.slice(0, 4).map((finding) => (
                <article className="list-card" key={finding.id}>
                  <div className="list-card-top">
                    <strong>{finding.title}</strong>
                    <StatusBadge value={finding.severity} />
                  </div>
                  <p>{finding.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No audit has been run for this website yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Latest opportunities" description="Closest topics to the planning queue.">
          {latestOpportunities.length > 0 ? (
            <div className="stack-list">
              {latestOpportunities.map((opportunity) => (
                <article className="list-card" key={opportunity.id}>
                  <div className="list-card-top">
                    <strong>{opportunity.keyword}</strong>
                    <StatusBadge value={opportunity.status} />
                  </div>
                  <p>
                    {opportunity.cluster} • {opportunity.intent} • Relevance {opportunity.relevanceScore}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No opportunities generated yet.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Latest drafts" description="Recent generated drafts and readiness state.">
        {latestDrafts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {latestDrafts.map((draft) => (
                <tr key={draft.id}>
                  <td>{draft.slug}</td>
                  <td>
                    <StatusBadge value={draft.status} />
                  </td>
                  <td>{draft.readinessScore}</td>
                  <td>{formatDate(draft.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted-copy">No drafts generated yet.</p>
        )}
      </SectionCard>

      <div className="inline-links">
        <Link className="text-link" to="/app/analysis">
          Open analysis workspace
        </Link>
        <Link className="text-link" to="/app/opportunities">
          Open opportunities
        </Link>
        <Link className="text-link" to="/app/drafts">
          Open draft studio
        </Link>
      </div>
    </div>
  );
}
