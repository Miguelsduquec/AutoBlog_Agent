import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { formatDate } from "../utils/format";

export function AnalysisPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const detailQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getWebsiteDetail(selectedWebsiteId) : Promise.resolve(null)),
    [selectedWebsiteId]
  );
  const analysisQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getWebsiteAnalyses(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );

  if (websitesQuery.loading || detailQuery.loading || analysisQuery.loading) {
    return <div className="state-card">Loading website analysis…</div>;
  }

  if (websitesQuery.error || detailQuery.error || analysisQuery.error || !websitesQuery.data || !detailQuery.data || !analysisQuery.data) {
    return <div className="state-card error">Unable to load website analysis.</div>;
  }

  const latestAnalysis = analysisQuery.data[0];

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Website analysis"
        description="Review extracted pages, metadata, headings, niche summary, and coverage signals."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <button
            className="button"
            onClick={() =>
              void (async () => {
                await api.analyzeWebsite(selectedWebsiteId);
                await detailQuery.refresh();
                await analysisQuery.refresh();
              })()
            }
          >
            Run fresh analysis
          </button>
        }
      />

      {!latestAnalysis ? (
        <EmptyState title="No analysis runs yet" description="Run website analysis to populate extracted page signals." />
      ) : (
        <>
          <div className="grid-two">
            <SectionCard title="Niche summary and keywords" description="Latest mock-AI summary plus the strongest extracted keywords.">
              <p className="detail-summary">{latestAnalysis.nicheSummary}</p>
              <div className="pill-row">
                {(latestAnalysis.keywordsJson ?? latestAnalysis.contentPillarsJson).map((pillar) => (
                  <span className="mini-pill" key={pillar}>
                    {pillar}
                  </span>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Coverage overview" description="Snapshot of the current website profile.">
              <div className="detail-list">
                <div>
                  <strong>Analyzed pages</strong>
                  <span>{latestAnalysis.analyzedPageCount}</span>
                </div>
                <div>
                  <strong>Latest run</strong>
                  <span>{formatDate(latestAnalysis.createdAt)}</span>
                </div>
                <div>
                  <strong>Primary pages</strong>
                  <span>{detailQuery.data.pages.map((page) => page.pageType).join(", ")}</span>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Analyzed pages" description="Visible page signals extracted by the MVP crawler.">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Title</th>
                  <th>Meta description</th>
                  <th>H1</th>
                  <th>Headings extracted</th>
                </tr>
              </thead>
              <tbody>
                {detailQuery.data.pages.map((page) => (
                  <tr key={page.id}>
                    <td>{page.url}</td>
                    <td>{page.title}</td>
                    <td>{page.metaDescription || "Missing"}</td>
                    <td>{page.h1}</td>
                    <td>{page.headingsJson.join(" • ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </div>
  );
}
