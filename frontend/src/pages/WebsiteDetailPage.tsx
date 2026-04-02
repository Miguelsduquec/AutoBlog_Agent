import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccessGateRedirect } from "../access/useAccessGateRedirect";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { useAsyncData } from "../hooks/useAsyncData";
import { AutomationRunRequest, WebsiteAnalysisRun } from "../types";
import { formatDate } from "../utils/format";

const defaultAutomationOptions: AutomationRunRequest = {
  runType: "full-pipeline",
  maxOpportunities: 5,
  generateDrafts: true,
  exportDrafts: false
};

function confidenceCopy(analysis: WebsiteAnalysisRun | null): string {
  if (!analysis) {
    return "Run analysis to see how much useful context was captured.";
  }

  if (analysis.confidenceLevel === "high") {
    return "Enough page depth was captured to generate topics normally.";
  }

  if (analysis.confidenceLevel === "medium") {
    return "The scan is usable, but the site only exposed partial signals.";
  }

  return "The scan is weak. Check the URL or use a richer site before generating topics.";
}

export function WebsiteDetailPage() {
  const handleAccessError = useAccessGateRedirect();
  const { websiteId = "" } = useParams();
  const detailQuery = useAsyncData(() => api.getWebsiteDetail(websiteId), [websiteId]);
  const [activeAction, setActiveAction] = useState<string>("");
  const [generationMessage, setGenerationMessage] = useState<string>("");
  const [automationMessage, setAutomationMessage] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [automationPanelOpen, setAutomationPanelOpen] = useState(false);
  const [automationOptions, setAutomationOptions] = useState<AutomationRunRequest>(defaultAutomationOptions);

  async function runAction(actionKey: string, task: () => Promise<unknown>) {
    setActiveAction(actionKey);
    setActionError("");
    try {
      await task();
      await detailQuery.refresh();
    } catch (error) {
      if (handleAccessError(error)) {
        return;
      }

      setActionError(error instanceof Error ? error.message : "Something went wrong.");
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
  const opportunityBlocked = !latestAnalysis || latestAnalysis.confidenceLevel === "low";

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>{website.name}</h1>
          <p>
            {website.niche} • {website.language} • {website.targetCountry}
          </p>
        </div>
        <div className="toolbar-controls">
          <button
            className="button secondary"
            data-testid="analyze-website-button"
            onClick={() => runAction("analyze", () => api.analyzeWebsite(website.id))}
          >
            {activeAction === "analyze" ? "Analyzing…" : "Analyze"}
          </button>
          <button
            className="button secondary"
            data-testid="generate-opportunities-button"
            disabled={opportunityBlocked || activeAction === "opportunities"}
            onClick={() =>
              runAction("opportunities", async () => {
                const result = await api.generateOpportunities(website.id, 10);
                setGenerationMessage(result.summaryMessage);
              })
            }
          >
            {activeAction === "opportunities" ? "Generating…" : "Find topics"}
          </button>
          <button className="button secondary" onClick={() => runAction("audit", () => api.runSeoAudit(website.id))}>
            {activeAction === "audit" ? "Auditing…" : "SEO audit"}
          </button>
          <button className="button" data-testid="run-automation-toggle" onClick={() => setAutomationPanelOpen((current) => !current)}>
            {automationPanelOpen ? "Close automation" : "Automation"}
          </button>
        </div>
      </div>

      {generationMessage ? <div className="state-card">{generationMessage}</div> : null}
      {automationMessage ? <div className="state-card">{automationMessage}</div> : null}
      {actionError ? <div className="state-card error">{actionError}</div> : null}
      {latestAnalysis ? (
        <div className={`state-card ${latestAnalysis.confidenceLevel === "low" ? "warning" : ""}`}>
          <div className="list-card-top">
            <strong>Analysis confidence</strong>
            <StatusBadge value={latestAnalysis.confidenceLevel} />
          </div>
          <p>
            Score {latestAnalysis.confidenceScore}/100. {confidenceCopy(latestAnalysis)}
          </p>
        </div>
      ) : null}

      {automationPanelOpen ? (
        <SectionCard
          title="Automation"
          description="Run one step or the full pipeline."
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
                data-testid="automation-submit-button"
                disabled={activeAction === "automation"}
                onClick={() => void handleAutomationRun(website.id)}
              >
                {activeAction === "automation" ? "Running…" : "Run"}
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
        <MetricCard title="Pages analyzed" value={latestAnalysis?.analyzedPageCount ?? pages.length} help="Pages used for context" />
        <MetricCard title="Latest audit score" value={latestAudit?.score ?? "Not run"} help="Current SEO score" />
        <MetricCard
          title="Latest drafts"
          value={latestDrafts.length}
          help="Drafts created recently"
        />
      </div>

      <div className="grid-two">
        <SectionCard title="Summary" description="Core website settings.">
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

        <SectionCard title="Content pillars" description="Main themes from the latest scan.">
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
        <SectionCard title="Extracted data" description="Main signals from the latest scan.">
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
              <div>
                <strong>Main text</strong>
                <span>{latestAnalysis.extractedDataJson.mainTextContent || "Not found"}</span>
              </div>
            </div>
          ) : (
            <p className="muted-copy">No extracted data available yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Niche summary" description="Short summary of what the site appears to do.">
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

      <SectionCard title="Analyzed pages" description="Pages used in the latest scan.">
        {pages.length === 0 ? (
          <p className="muted-copy">No analyzed pages stored yet.</p>
        ) : (
          <TableShell label="Analyzed pages">
            <thead>
              <tr>
                <th>Page</th>
                <th>Type</th>
                <th>H1</th>
                <th>Headings</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <div>{page.title}</div>
                    <div className="table-subtext">{page.url}</div>
                  </td>
                  <td>
                    <StatusBadge value={page.pageType} />
                  </td>
                  <td>{page.h1 || "Missing"}</td>
                  <td>{page.headingsJson.join(" • ") || "Missing"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <SectionCard title="Main text" description="Extracted body content.">
        {latestAnalysis ? (
          <p className="detail-summary">{latestAnalysis.extractedDataJson.mainTextContent || "No main text content extracted."}</p>
        ) : (
          <p className="muted-copy">Run website analysis to extract main page content.</p>
        )}
      </SectionCard>

      <div className="grid-two">
        <SectionCard title="Latest audit" description="Top issues from the last audit.">
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

        <SectionCard title="Latest opportunities" description="Topics ready to turn into plans.">
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

      <SectionCard title="Latest drafts" description="Recent draft status.">
        {latestDrafts.length > 0 ? (
          <TableShell label="Latest drafts">
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
          </TableShell>
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
