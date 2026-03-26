import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { formatDate } from "../utils/format";

export function AutomationRunsPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const runsQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getAutomationRuns(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );

  async function triggerRun() {
    await api.triggerAutomationRun(selectedWebsiteId, "manual-generation-run", 2);
    await runsQuery.refresh();
  }

  if (websitesQuery.loading || runsQuery.loading) {
    return <div className="state-card">Loading automation runs…</div>;
  }

  if (websitesQuery.error || runsQuery.error || !websitesQuery.data || !runsQuery.data) {
    return <div className="state-card error">Unable to load automation runs.</div>;
  }

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Automation runs"
        description="Track scheduled or manual generation runs, execution status, logs, and output summaries."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <button className="button" onClick={() => void triggerRun()}>
            Trigger run
          </button>
        }
      />

      <SectionCard title="Run history" description="Each run records workflow status, logs, and the resulting output summary.">
        {runsQuery.data.length === 0 ? (
          <EmptyState title="No automation runs yet" description="Trigger a run to generate plans and drafts automatically." />
        ) : (
          <div className="stack-list">
            {runsQuery.data.map((run) => (
              <article className="list-card" key={run.id}>
                <div className="list-card-top">
                  <div>
                    <strong>{run.runType}</strong>
                    <div className="muted-copy">{formatDate(run.createdAt)}</div>
                  </div>
                  <StatusBadge value={run.status} />
                </div>
                <p>{run.outputSummary}</p>
                <div className="log-list">
                  {run.logsJson.map((entry, index) => (
                    <div className="log-line" key={`${run.id}-${index}`}>
                      {entry}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
