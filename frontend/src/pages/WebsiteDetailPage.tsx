import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAsyncData } from "../hooks/useAsyncData";
import { AutomationRunRequest } from "../types";
import { formatDate } from "../utils/format";

const defaultAutomationOptions: AutomationRunRequest = {
  runType: "full-pipeline",
  maxOpportunities: 5,
  generateDrafts: true,
  exportDrafts: false
};

export function WebsiteDetailPage() {
  const { websiteId = "" } = useParams();
  const detailQuery = useAsyncData(() => api.getWebsiteDetail(websiteId), [websiteId]);
  const [activeAction, setActiveAction] = useState<string>("");
  const [generationMessage, setGenerationMessage] = useState<string>("");
  const [automationMessage, setAutomationMessage] = useState<string>("");
  const [automationPanelOpen, setAutomationPanelOpen] = useState(false);
  const [automationOptions, setAutomationOptions] = useState<AutomationRunRequest>(defaultAutomationOptions);

  async function runAction(actionKey: string, task: () => Promise<unknown>) {
    setActiveAction(actionKey);
    try {
      await task();
      await detailQuery.refresh();
    } finally {
      setActiveAction("");
    }
  }

  async function handleAutomationRun(websiteId: string) {
    await runAction("automation", async () => {
      const run = await api.triggerAutomationRun(websiteId, automationOptions);
      setAutomationMessage(run.outputSummary.message || "Automation run completed.");
      setAutomationPanelOpen(false);
    });
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
            {activeAction === "analyze" ? "Analyzing…" : "Analyze Website"}
          </button>
          <button
            className="button secondary"
            disabled={!latestAnalysis || activeAction === "opportunities"}
            onClick={() =>
              runAction("opportunities", async () => {
                const result = await api.generateOpportunities(website.id, 10);
                setGenerationMessage(result.summaryMessage);
              })
            }
          >
            {activeAction === "opportunities" ? "Generating…" : "Generate Opportunities"}
          </button>
          <button className="button secondary" onClick={() => runAction("audit", () => api.runSeoAudit(website.id))}>
            {activeAction === "audit" ? "Auditing…" : "Run SEO audit"}
          </button>
          <button className="button" onClick={() => setAutomationPanelOpen((current) => !current)}>
            {automationPanelOpen ? "Close automation" : "Run Automation"}
          </button>
        </div>
      </div>

      {generationMessage ? <div className="state-card">{generationMessage}</div> : null}
      {automationMessage ? <div className="state-card">{automationMessage}</div> : null}

      {automationPanelOpen ? (
        <SectionCard
          title="Automation run options"
          description="Run a focused step or a full multi-step content pipeline for this website."
          actions={
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={activeAction === "automation"}
                onClick={() => setAutomationPanelOpen(false)}
              >
                Cancel
              </button>
              <button
                className="button"
                disabled={activeAction === "automation"}
                onClick={() => void handleAutomationRun(website.id)}
              >
                {activeAction === "automation" ? "Running…" : "Start run"}
              </button>
            </div>
          }
        >
          <div className="form-grid">
            <label>
              Run type
              <select
                value={automationOptions.runType}
                onChange={(event) => {
                  const runType = event.target.value as AutomationRunRequest["runType"];
                  setAutomationOptions((current) => ({
                    ...current,
                    runType,
                    generateDrafts: runType === "full-pipeline" ? current.generateDrafts : false,
                    exportDrafts: runType === "full-pipeline" ? current.exportDrafts && current.generateDrafts : false
                  }));
                }}
              >
                <option value="full-pipeline">full-pipeline</option>
                <option value="opportunities-only">opportunities-only</option>
                <option value="analyze-only">analyze-only</option>
              </select>
            </label>

            <label>
              Max opportunities
              <input
                type="number"
                min={1}
                max={10}
                value={automationOptions.maxOpportunities ?? 5}
                onChange={(event) =>
                  setAutomationOptions((current) => ({
                    ...current,
                    maxOpportunities: Number(event.target.value)
                  }))
                }
              />
            </label>

            <label>
              Generate drafts
              <select
                value={automationOptions.generateDrafts ? "yes" : "no"}
                disabled={automationOptions.runType !== "full-pipeline"}
                onChange={(event) =>
                  setAutomationOptions((current) => {
                    const generateDrafts = event.target.value === "yes";
                    return {
                      ...current,
                      generateDrafts,
                      exportDrafts: generateDrafts ? current.exportDrafts : false
                    };
                  })
                }
              >
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </label>

            <label>
              Export drafts
              <select
                value={automationOptions.exportDrafts ? "yes" : "no"}
                disabled={automationOptions.runType !== "full-pipeline" || !automationOptions.generateDrafts}
                onChange={(event) =>
                  setAutomationOptions((current) => ({
                    ...current,
                    exportDrafts: event.target.value === "yes"
                  }))
                }
              >
                <option value="no">no</option>
                <option value="yes">yes</option>
              </select>
            </label>
          </div>
        </SectionCard>
      ) : null}

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
            {(latestAnalysis?.keywordsJson ?? latestAnalysis?.contentPillarsJson ?? []).map((pillar) => (
              <span className="mini-pill" key={pillar}>
                {pillar}
              </span>
            ))}
          </div>
          <p className="detail-summary">{latestAnalysis?.nicheSummary ?? "No analysis summary yet."}</p>
        </SectionCard>
      </div>

      <div className="grid-two">
        <SectionCard title="Extracted data" description="Raw homepage signals captured during the latest website analysis.">
          {latestAnalysis ? (
            <div className="detail-list">
              <div>
                <strong>Title</strong>
                <span>{latestAnalysis.extractedDataJson.title || "Not found"}</span>
              </div>
              <div>
                <strong>Meta description</strong>
                <span>{latestAnalysis.extractedDataJson.metaDescription || "Not found"}</span>
              </div>
              <div>
                <strong>H1</strong>
                <span>{latestAnalysis.extractedDataJson.h1 || "Not found"}</span>
              </div>
              <div>
                <strong>H2 headings</strong>
                <span>{latestAnalysis.extractedDataJson.h2Headings.join(" • ") || "Not found"}</span>
              </div>
            </div>
          ) : (
            <p className="muted-copy">No extracted data available yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Niche summary" description="Simple mock-AI interpretation based on the extracted homepage content.">
          {latestAnalysis ? (
            <div className="stack-list">
              <p className="detail-summary">{latestAnalysis.nicheSummary}</p>
              <div className="pill-row">
                {latestAnalysis.keywordsJson.map((keyword) => (
                  <span className="mini-pill" key={keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted-copy">Run website analysis to generate the first niche summary and keywords.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Main text content" description="Basic extracted body content from the analyzed URL.">
        {latestAnalysis ? (
          <p className="detail-summary">{latestAnalysis.extractedDataJson.mainTextContent || "No main text content extracted."}</p>
        ) : (
          <p className="muted-copy">Run website analysis to extract main page content.</p>
        )}
      </SectionCard>

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
                    <strong>{opportunity.topic}</strong>
                    <StatusBadge value={opportunity.status} />
                  </div>
                  <p>
                    {opportunity.keyword}
                  </p>
                  <div className="pill-row">
                    <StatusBadge value={opportunity.intent} />
                    <StatusBadge value={opportunity.priority} />
                  </div>
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
        <Link className="text-link" to="/app/automation-runs">
          Open automation runs
        </Link>
        <Link className="text-link" to="/app/websites">
          Manage websites
        </Link>
      </div>
    </div>
  );
}
