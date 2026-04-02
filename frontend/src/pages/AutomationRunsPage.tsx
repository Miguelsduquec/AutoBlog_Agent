import { useMemo, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { useAsyncData } from "../hooks/useAsyncData";
import { AutomationRun, AutomationRunType, AutomationStatus } from "../types";
import { formatDate } from "../utils/format";

type RunStatusFilter = AutomationStatus | "all";
type RunTypeFilter = AutomationRunType | "all";

function getRunSummary(run: AutomationRun): string {
  if (run.outputSummary.message) {
    return run.outputSummary.message;
  }

  return "No summary available yet.";
}

export function AutomationRunsPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const opportunitiesQuery = useAsyncData(() => api.getOpportunities(), []);
  const plansQuery = useAsyncData(() => api.getPlans(), []);
  const draftsQuery = useAsyncData(() => api.getDrafts(), []);
  const exportsQuery = useAsyncData(() => api.getExports(), []);
  const runsQuery = useAsyncData(() => api.getAutomationRuns(), []);
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>("all");
  const [runTypeFilter, setRunTypeFilter] = useState<RunTypeFilter>("all");
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isLoading =
    websitesQuery.loading ||
    opportunitiesQuery.loading ||
    plansQuery.loading ||
    draftsQuery.loading ||
    exportsQuery.loading ||
    runsQuery.loading;

  const hasError =
    websitesQuery.error ||
    opportunitiesQuery.error ||
    plansQuery.error ||
    draftsQuery.error ||
    exportsQuery.error ||
    runsQuery.error ||
    !websitesQuery.data ||
    !opportunitiesQuery.data ||
    !plansQuery.data ||
    !draftsQuery.data ||
    !exportsQuery.data ||
    !runsQuery.data;

  const websiteMap = useMemo(
    () => new Map((websitesQuery.data ?? []).map((website) => [website.id, website])),
    [websitesQuery.data]
  );
  const opportunityMap = useMemo(
    () => new Map((opportunitiesQuery.data ?? []).map((opportunity) => [opportunity.id, opportunity])),
    [opportunitiesQuery.data]
  );
  const planMap = useMemo(
    () => new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan])),
    [plansQuery.data]
  );
  const draftMap = useMemo(
    () => new Map((draftsQuery.data ?? []).map((draft) => [draft.id, draft])),
    [draftsQuery.data]
  );
  const exportMap = useMemo(
    () => new Map((exportsQuery.data ?? []).map((job) => [job.id, job])),
    [exportsQuery.data]
  );

  if (isLoading) {
    return <div className="state-card">Loading automation runs…</div>;
  }

  if (hasError) {
    return <div className="state-card error">Unable to load automation runs.</div>;
  }

  const websites = websitesQuery.data ?? [];
  const runs = runsQuery.data ?? [];

  const filteredRuns = runs.filter((run) => {
    if (websiteFilter !== "all" && run.websiteId !== websiteFilter) {
      return false;
    }

    if (statusFilter !== "all" && run.status !== statusFilter) {
      return false;
    }

    if (runTypeFilter !== "all" && run.runType !== runTypeFilter) {
      return false;
    }

    return true;
  });

  async function openRun(runId: string) {
    setDetailLoading(true);
    try {
      const run = await api.getAutomationRun(runId);
      setSelectedRun(run);
    } finally {
      setDetailLoading(false);
    }
  }

  const selectedOpportunityLabels = selectedRun
    ? selectedRun.outputSummary.outputIds.opportunityIds.map(
        (id) => opportunityMap.get(id)?.topic ?? opportunityMap.get(id)?.keyword ?? id
      )
    : [];
  const selectedPlanLabels = selectedRun
    ? selectedRun.outputSummary.outputIds.planIds.map((id) => planMap.get(id)?.title ?? id)
    : [];
  const selectedDraftLabels = selectedRun
    ? selectedRun.outputSummary.outputIds.draftIds.map((id) => {
        const draft = draftMap.get(id);
        const plan = draft ? planMap.get(draft.articlePlanId) : null;
        return plan?.title ?? draft?.slug ?? id;
      })
    : [];
  const selectedExportLabels = selectedRun
    ? selectedRun.outputSummary.outputIds.exportJobIds.map((id) => exportMap.get(id)?.exportPath ?? id)
    : [];

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Automation runs</h1>
          <p>Track automated runs and what they created.</p>
        </div>
        <div className="toolbar-controls">
          <select aria-label="Website filter" value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value)}>
            <option value="all">All websites</option>
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
          <select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RunStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="queued">queued</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="partial">partial</option>
            <option value="failed">failed</option>
          </select>
          <select aria-label="Run type filter" value={runTypeFilter} onChange={(event) => setRunTypeFilter(event.target.value as RunTypeFilter)}>
            <option value="all">All run types</option>
            <option value="analyze-only">analyze-only</option>
            <option value="opportunities-only">opportunities-only</option>
            <option value="full-pipeline">full-pipeline</option>
          </select>
        </div>
      </div>

      <SectionCard title="Run history" description="Recent runs and outcomes.">
        {filteredRuns.length === 0 ? (
          <EmptyState
            title="No automation runs yet"
            description="Start a run from a website page."
          />
        ) : (
          <TableShell label="Automation runs">
            <thead>
              <tr>
                <th>Website</th>
                <th>Run type</th>
                <th>Status</th>
                <th>Summary</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id}>
                  <td>{websiteMap.get(run.websiteId)?.name ?? "Unknown website"}</td>
                  <td>
                    <span className="mini-pill">{run.runType}</span>
                  </td>
                  <td>
                    <StatusBadge value={run.status} />
                  </td>
                  <td>{getRunSummary(run)}</td>
                  <td>{formatDate(run.createdAt)}</td>
                  <td className="row-actions">
                    <button className="link-button" onClick={() => void openRun(run.id)}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <SectionCard
        title="Run detail"
        description="Logs, counts, and linked items."
      >
        {detailLoading ? (
          <div className="state-card">Loading automation run detail…</div>
        ) : selectedRun ? (
          <div className="stack-list">
            <div className="detail-list compact">
              <div>
                <strong>Website</strong>
                <span>{websiteMap.get(selectedRun.websiteId)?.name ?? selectedRun.websiteId}</span>
              </div>
              <div>
                <strong>Run type</strong>
                <span>{selectedRun.runType}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span>{selectedRun.status}</span>
              </div>
              <div>
                <strong>Created</strong>
                <span>{formatDate(selectedRun.createdAt)}</span>
              </div>
              <div>
                <strong>Updated</strong>
                <span>{formatDate(selectedRun.updatedAt)}</span>
              </div>
              <div>
                <strong>Analysis refreshed</strong>
                <span>{selectedRun.outputSummary.analysisCreated ? "Yes" : "No"}</span>
              </div>
              <div>
                <strong>Opportunities created</strong>
                <span>{selectedRun.outputSummary.opportunitiesCreated}</span>
              </div>
              <div>
                <strong>Plans created</strong>
                <span>{selectedRun.outputSummary.plansCreated}</span>
              </div>
              <div>
                <strong>Drafts created</strong>
                <span>{selectedRun.outputSummary.draftsCreated}</span>
              </div>
              <div>
                <strong>Exports created</strong>
                <span>{selectedRun.outputSummary.exportsCreated}</span>
              </div>
              <div>
                <strong>Skipped items</strong>
                <span>{selectedRun.outputSummary.skippedItems}</span>
              </div>
              <div>
                <strong>Errors</strong>
                <span>{selectedRun.outputSummary.errors.length}</span>
              </div>
            </div>

            <article className="list-card">
              <div className="list-card-top">
                <strong>Summary</strong>
                <StatusBadge value={selectedRun.status} />
              </div>
              <p>{getRunSummary(selectedRun)}</p>
            </article>

            <article className="list-card">
              <div className="list-card-top">
                <strong>Logs</strong>
              </div>
              <div className="log-list">
                {selectedRun.logsJson.map((entry, index) => (
                  <div className="log-line" key={`${selectedRun.id}-${index}`}>
                    {entry}
                  </div>
                ))}
              </div>
            </article>

            {selectedRun.outputSummary.errors.length > 0 ? (
              <article className="list-card">
                <div className="list-card-top">
                  <strong>Errors</strong>
                </div>
                <div className="log-list">
                  {selectedRun.outputSummary.errors.map((entry) => (
                    <div className="log-line" key={entry}>
                      {entry}
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            <div className="grid-two">
              <article className="list-card">
                <div className="list-card-top">
                  <strong>Linked opportunities</strong>
                </div>
                {selectedOpportunityLabels.length > 0 ? (
                  <div className="pill-row">
                    {selectedOpportunityLabels.map((label) => (
                      <span className="mini-pill" key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">No opportunities linked to this run.</p>
                )}
              </article>

              <article className="list-card">
                <div className="list-card-top">
                  <strong>Linked plans</strong>
                </div>
                {selectedPlanLabels.length > 0 ? (
                  <div className="pill-row">
                    {selectedPlanLabels.map((label) => (
                      <span className="mini-pill" key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">No plans linked to this run.</p>
                )}
              </article>
            </div>

            <div className="grid-two">
              <article className="list-card">
                <div className="list-card-top">
                  <strong>Linked drafts</strong>
                </div>
                {selectedDraftLabels.length > 0 ? (
                  <div className="pill-row">
                    {selectedDraftLabels.map((label) => (
                      <span className="mini-pill" key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">No drafts linked to this run.</p>
                )}
              </article>

              <article className="list-card">
                <div className="list-card-top">
                  <strong>Linked exports</strong>
                </div>
                {selectedExportLabels.length > 0 ? (
                  <div className="pill-row">
                    {selectedExportLabels.map((label) => (
                      <span className="mini-pill" key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">No exports linked to this run.</p>
                )}
              </article>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No run selected"
            description="Choose a run to inspect."
          />
        )}
      </SectionCard>
    </div>
  );
}
