import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { formatDate } from "../utils/format";

const packageFiles = ["content.html", "article.md", "metadata.json", "seo.json", "brief.json"];

export function ExportCenterPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const exportsQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getExports(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );
  const draftsQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getDrafts(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );

  async function handleExport(draftId: string) {
    await api.createExport(draftId);
    await exportsQuery.refresh();
  }

  if (websitesQuery.loading || exportsQuery.loading || draftsQuery.loading) {
    return <div className="state-card">Loading export center…</div>;
  }

  if (websitesQuery.error || exportsQuery.error || draftsQuery.error || !websitesQuery.data || !exportsQuery.data || !draftsQuery.data) {
    return <div className="state-card error">Unable to load export center.</div>;
  }

  const exportableDrafts = draftsQuery.data.filter((draft) => draft.status === "review" || draft.status === "ready");

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Export center"
        description="Package approved drafts for publication with HTML, Markdown, metadata, SEO, and brief files."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
      />

      <div className="grid-two wide-right">
        <SectionCard title="Ready to export" description="Human review remains in the loop before a package is created.">
          {exportableDrafts.length === 0 ? (
            <EmptyState title="No exportable drafts" description="Move a draft into review or ready state first." />
          ) : (
            <div className="stack-list">
              {exportableDrafts.map((draft) => (
                <article className="list-card" key={draft.id}>
                  <div className="list-card-top">
                    <strong>{draft.slug}</strong>
                    <StatusBadge value={draft.status} />
                  </div>
                  <p>Readiness score {draft.readinessScore}</p>
                  <button className="button secondary" onClick={() => void handleExport(draft.id)}>
                    Export package
                  </button>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Generated packages" description="Each export includes the file bundle required for publication workflows.">
          {exportsQuery.data.length === 0 ? (
            <EmptyState title="No export jobs yet" description="Export a draft to create the publication package." />
          ) : (
            <div className="stack-list">
              {exportsQuery.data.map((job) => (
                <article className="list-card" key={job.id}>
                  <div className="list-card-top">
                    <strong>{job.exportPath}</strong>
                    <StatusBadge value={job.status} />
                  </div>
                  <small>{formatDate(job.createdAt)}</small>
                  <div className="pill-row">
                    {packageFiles.map((file) => (
                      <span className="mini-pill" key={file}>
                        {file}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
