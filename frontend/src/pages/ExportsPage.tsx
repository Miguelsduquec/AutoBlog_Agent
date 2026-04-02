import { useMemo, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { useAsyncData } from "../hooks/useAsyncData";
import { ExportJob, WorkflowStatus } from "../types";
import { formatDate } from "../utils/format";

type ExportStatusFilter = WorkflowStatus | "all";

export function ExportsPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const draftsQuery = useAsyncData(() => api.getDrafts(), []);
  const plansQuery = useAsyncData(() => api.getPlans(), []);
  const exportsQuery = useAsyncData(() => api.getExports(), []);
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ExportStatusFilter>("all");
  const [selectedExport, setSelectedExport] = useState<Awaited<ReturnType<typeof api.getExport>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const draftMap = useMemo(
    () => new Map((draftsQuery.data ?? []).map((draft) => [draft.id, draft])),
    [draftsQuery.data]
  );
  const planMap = useMemo(
    () => new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan])),
    [plansQuery.data]
  );
  const websiteMap = useMemo(
    () => new Map((websitesQuery.data ?? []).map((website) => [website.id, website])),
    [websitesQuery.data]
  );

  if (websitesQuery.loading || draftsQuery.loading || plansQuery.loading || exportsQuery.loading) {
    return <div className="state-card">Loading exports…</div>;
  }

  if (websitesQuery.error || draftsQuery.error || plansQuery.error || exportsQuery.error || !websitesQuery.data || !draftsQuery.data || !plansQuery.data || !exportsQuery.data) {
    return <div className="state-card error">Unable to load exports.</div>;
  }

  const filteredExports = exportsQuery.data.filter((job) => {
    if (websiteFilter !== "all" && job.websiteId !== websiteFilter) {
      return false;
    }
    if (statusFilter !== "all" && job.status !== statusFilter) {
      return false;
    }

    return true;
  });

  async function openExport(job: ExportJob) {
    setDetailLoading(true);
    try {
      const detail = await api.getExport(job.id);
      setSelectedExport(detail);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Exports</h1>
          <p>Review export packages.</p>
        </div>
        <div className="toolbar-controls">
          <select aria-label="Website filter" value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value)}>
            <option value="all">All websites</option>
            {websitesQuery.data.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
          <select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExportStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="exported">exported</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>

      <SectionCard title="Export jobs" description="Saved export packages.">
        {filteredExports.length === 0 ? (
          <EmptyState title="No exports yet" description="Export a draft from the Drafts page to create the package." />
        ) : (
          <TableShell label="Export jobs">
            <thead>
              <tr>
                <th>Website</th>
                <th>Article title</th>
                <th>Status</th>
                <th>Export path</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredExports.map((job) => {
                const draft = draftMap.get(job.draftId);
                const plan = draft ? planMap.get(draft.articlePlanId) : null;
                return (
                  <tr key={job.id}>
                    <td>{websiteMap.get(job.websiteId)?.name ?? "Unknown website"}</td>
                    <td>{plan?.title ?? draft?.slug ?? "Unknown article"}</td>
                    <td>
                      <StatusBadge value={job.status} />
                    </td>
                    <td>{job.exportPath}</td>
                    <td>{formatDate(job.createdAt)}</td>
                    <td className="row-actions">
                      <button className="link-button" onClick={() => void openExport(job)}>
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <SectionCard
        title="Export detail"
        description="Files and linked content."
      >
        {detailLoading ? (
          <div className="state-card">Loading export detail…</div>
        ) : selectedExport ? (
          <div className="stack-list">
            <div className="detail-list">
              <div>
                <strong>Export path</strong>
                <span>{selectedExport.exportJob.exportPath}</span>
              </div>
              <div>
                <strong>Linked draft</strong>
                <span>{selectedExport.draft?.slug ?? selectedExport.exportJob.draftId}</span>
              </div>
              <div>
                <strong>Linked article plan</strong>
                <span>{selectedExport.articlePlan?.title ?? "Not found"}</span>
              </div>
              <div>
                <strong>Linked website</strong>
                <span>{selectedExport.website?.name ?? "Not found"}</span>
              </div>
            </div>

            <article className="list-card">
              <div className="list-card-top">
                <strong>Exported files</strong>
                <StatusBadge value={selectedExport.exportJob.status} />
              </div>
              <div className="pill-row">
                {selectedExport.files.map((file) => (
                  <span className="mini-pill" key={file}>
                    {file}
                  </span>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <EmptyState title="No export selected" description="Choose an export to inspect." />
        )}
      </SectionCard>
    </div>
  );
}
