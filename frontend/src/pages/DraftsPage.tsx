import { useMemo, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAsyncData } from "../hooks/useAsyncData";
import { Draft, WorkflowStatus } from "../types";
import { formatDate } from "../utils/format";

type DraftStatusFilter = WorkflowStatus | "all";

export function DraftsPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const plansQuery = useAsyncData(() => api.getPlans(), []);
  const draftsQuery = useAsyncData(() => api.getDrafts(), []);
  const [websiteFilter, setWebsiteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>("all");
  const [minReadiness, setMinReadiness] = useState<number>(0);
  const [maxReadiness, setMaxReadiness] = useState<number>(100);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [exportingDraftId, setExportingDraftId] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  const websiteMap = useMemo(
    () => new Map((websitesQuery.data ?? []).map((website) => [website.id, website])),
    [websitesQuery.data]
  );
  const planMap = useMemo(
    () => new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan])),
    [plansQuery.data]
  );

  if (websitesQuery.loading || plansQuery.loading || draftsQuery.loading) {
    return <div className="state-card">Loading drafts…</div>;
  }

  if (websitesQuery.error || plansQuery.error || draftsQuery.error || !websitesQuery.data || !plansQuery.data || !draftsQuery.data) {
    return <div className="state-card error">Unable to load drafts.</div>;
  }

  const filteredDrafts = draftsQuery.data.filter((draft) => {
    if (websiteFilter !== "all" && draft.websiteId !== websiteFilter) {
      return false;
    }
    if (statusFilter !== "all" && draft.status !== statusFilter) {
      return false;
    }
    if (draft.readinessScore < minReadiness || draft.readinessScore > maxReadiness) {
      return false;
    }

    return true;
  });

  async function openDraft(draftId: string) {
    setDetailLoading(true);
    try {
      const draft = await api.getDraft(draftId);
      setSelectedDraft(draft);
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshAfter(action: Promise<unknown>, draftId?: string) {
    await action;
    await draftsQuery.refresh();
    if (draftId) {
      await openDraft(draftId);
    }
  }

  async function handleBatchGenerate() {
    if (websiteFilter === "all") {
      setGenerationMessage("Select a website to batch-generate drafts.");
      return;
    }

    const drafts = await api.generateDraftBatch(websiteFilter, 3);
    setGenerationMessage(
      drafts.length > 0 ? `Generated ${drafts.length} drafts for the selected website.` : "No new drafts were created."
    );
    await draftsQuery.refresh();
  }

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Drafts</h1>
          <p>Inspect structured article drafts, review metadata, and prepare content for human review.</p>
        </div>
        <div className="toolbar-controls">
          <select value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value)}>
            <option value="all">All websites</option>
            {websitesQuery.data.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DraftStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="drafting">drafting</option>
            <option value="review">review</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
          </select>
          <div className="range-inputs">
            <input
              type="number"
              min={0}
              max={100}
              value={minReadiness}
              onChange={(event) => setMinReadiness(Number(event.target.value))}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={maxReadiness}
              onChange={(event) => setMaxReadiness(Number(event.target.value))}
            />
          </div>
          <button className="button" onClick={() => void handleBatchGenerate()}>
            Generate drafts
          </button>
        </div>
      </div>

      {generationMessage ? <div className="state-card">{generationMessage}</div> : null}
      {exportMessage ? <div className="state-card">{exportMessage}</div> : null}

      <SectionCard title="Draft queue" description="Publication-oriented drafts created from structured article plans.">
        {filteredDrafts.length === 0 ? (
          <EmptyState title="No drafts yet" description="Generate a draft from an article plan or batch-generate drafts for a website." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Related website</th>
                <th>Target keyword</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.map((draft) => {
                const plan = planMap.get(draft.articlePlanId);
                return (
                  <tr key={draft.id}>
                    <td>{plan?.title ?? draft.slug}</td>
                    <td>{websiteMap.get(draft.websiteId)?.name ?? "Unknown website"}</td>
                    <td>{plan?.targetKeyword ?? "Unknown keyword"}</td>
                    <td>
                      <StatusBadge value={draft.status} />
                    </td>
                    <td>{draft.readinessScore}</td>
                    <td>{formatDate(draft.createdAt)}</td>
                    <td className="row-actions">
                      <button className="link-button" onClick={() => void openDraft(draft.id)}>
                        View details
                      </button>
                      <button
                        className="link-button"
                        disabled={exportingDraftId === draft.id}
                        onClick={() =>
                          void (async () => {
                            setExportingDraftId(draft.id);
                            try {
                              const result = await api.createExport(draft.id);
                              setExportMessage(result.summaryMessage);
                            } finally {
                              setExportingDraftId("");
                            }
                          })()
                        }
                      >
                        {exportingDraftId === draft.id ? "Exporting…" : "Export"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard
        title="Draft detail"
        description="Review structure, metadata, HTML preview, FAQ, and internal links before marking a draft ready."
        actions={
          selectedDraft ? (
            <div className="toolbar-controls">
              <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "outline"), selectedDraft.id)}>
                Regenerate outline
              </button>
              <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "body"), selectedDraft.id)}>
                Regenerate body
              </button>
              <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "meta"), selectedDraft.id)}>
                Refresh metadata
              </button>
              <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "faq"), selectedDraft.id)}>
                Refresh FAQ
              </button>
              <button className="button" onClick={() => void refreshAfter(api.markDraftReady(selectedDraft.id), selectedDraft.id)}>
                Mark review-ready
              </button>
            </div>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="state-card">Loading draft detail…</div>
        ) : selectedDraft ? (
          <div className="stack-list">
            <div className="detail-list">
              <div>
                <strong>Slug</strong>
                <span>{selectedDraft.slug}</span>
              </div>
              <div>
                <strong>Meta title</strong>
                <span>{selectedDraft.metaTitle}</span>
              </div>
              <div>
                <strong>Meta description</strong>
                <span>{selectedDraft.metaDescription}</span>
              </div>
              <div>
                <strong>Readiness score</strong>
                <span>{selectedDraft.readinessScore}</span>
              </div>
            </div>

            <div className="outline-grid">
              <div>
                <h3>Outline</h3>
                <ul className="content-list">
                  {selectedDraft.outlineJson.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Internal links</h3>
                <ul className="content-list">
                  {selectedDraft.internalLinksJson.map((link) => (
                    <li key={link.url}>
                      {link.label} • {link.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid-two">
              <article className="list-card">
                <div className="list-card-top">
                  <strong>Article markdown</strong>
                </div>
                <pre className="code-block">{selectedDraft.articleMarkdown}</pre>
              </article>
              <article className="list-card">
                <div className="list-card-top">
                  <strong>HTML preview</strong>
                </div>
                <div className="article-preview" dangerouslySetInnerHTML={{ __html: selectedDraft.articleHtml }} />
              </article>
            </div>

            <div className="faq-block">
              <h3>FAQ</h3>
              {selectedDraft.faqJson.map((item) => (
                <article key={item.question} className="faq-item">
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No draft selected" description="Choose a draft from the table to inspect its content package and SEO metadata." />
        )}
      </SectionCard>
    </div>
  );
}
