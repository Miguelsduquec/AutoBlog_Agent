import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { formatDate } from "../utils/format";

export function SeoAuditPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const auditsQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getWebsiteAudits(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );

  if (websitesQuery.loading || auditsQuery.loading) {
    return <div className="state-card">Loading SEO audit…</div>;
  }

  if (websitesQuery.error || auditsQuery.error || !websitesQuery.data || !auditsQuery.data) {
    return <div className="state-card error">Unable to load SEO audit data.</div>;
  }

  const latestAudit = auditsQuery.data[0];

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="SEO audit"
        description="Inspect content structure, metadata, heading quality, and support-content gaps."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <button
            className="button"
            onClick={() =>
              void (async () => {
                await api.runSeoAudit(selectedWebsiteId);
                await auditsQuery.refresh();
              })()
            }
          >
            Run audit
          </button>
        }
      />

      {!latestAudit ? (
        <EmptyState title="No audit yet" description="Run an SEO content audit to see findings and score." />
      ) : (
        <>
          <div className="score-hero">
            <div>
              <span className="eyebrow">Overall score</span>
              <h2>{latestAudit.score}</h2>
            </div>
            <div>
              <p>Latest audit run</p>
              <strong>{formatDate(latestAudit.createdAt)}</strong>
            </div>
          </div>

          <SectionCard title="Issue list" description="Findings are grouped into actionable content and on-page improvements.">
            <div className="stack-list">
              {latestAudit.findingsJson.map((finding) => (
                <article className="list-card" key={finding.id}>
                  <div className="list-card-top">
                    <strong>{finding.title}</strong>
                    <StatusBadge value={finding.severity} />
                  </div>
                  <p>{finding.description}</p>
                  <small>
                    {finding.category}
                    {finding.pageUrl ? ` • ${finding.pageUrl}` : ""}
                  </small>
                  <div className="recommendation">{finding.recommendation}</div>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
