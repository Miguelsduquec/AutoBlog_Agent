import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";

export function DraftStudioPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const draftsQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getDrafts(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");

  useEffect(() => {
    const firstDraftId = draftsQuery.data?.[0]?.id ?? "";
    setSelectedDraftId(firstDraftId);
  }, [draftsQuery.data]);

  const selectedDraft = draftsQuery.data?.find((draft) => draft.id === selectedDraftId) ?? null;

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    await draftsQuery.refresh();
  }

  if (websitesQuery.loading || draftsQuery.loading) {
    return <div className="state-card">Loading drafts…</div>;
  }

  if (websitesQuery.error || draftsQuery.error || !websitesQuery.data || !draftsQuery.data) {
    return <div className="state-card error">Unable to load drafts.</div>;
  }

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Draft studio"
        description="Generate article drafts, improve sections, inspect metadata, and move drafts into review-ready state."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <button className="button" onClick={() => void refreshAfter(api.generateDraftBatch(selectedWebsiteId, 2))}>
            Generate drafts
          </button>
        }
      />

      {draftsQuery.data.length === 0 || !selectedDraft ? (
        <EmptyState title="No drafts yet" description="Generate article drafts from the plan queue to start review." />
      ) : (
        <div className="grid-two wide-right">
          <SectionCard title="Draft queue" description="Review the latest generated drafts for this website.">
            <div className="stack-list">
              {draftsQuery.data.map((draft) => (
                <button
                  className={draft.id === selectedDraftId ? "draft-list-item active" : "draft-list-item"}
                  key={draft.id}
                  onClick={() => setSelectedDraftId(draft.id)}
                >
                  <div className="list-card-top">
                    <strong>{draft.slug}</strong>
                    <StatusBadge value={draft.status} />
                  </div>
                  <p>Readiness score {draft.readinessScore}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Draft detail"
            description="Inspect outline, metadata, body, FAQ, and internal links before marking a draft ready."
            actions={
              <div className="toolbar-controls">
                <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "outline"))}>
                  Regenerate outline
                </button>
                <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "body"))}>
                  Regenerate body
                </button>
                <button className="button secondary" onClick={() => void refreshAfter(api.regenerateDraft(selectedDraft.id, "meta"))}>
                  Refresh metadata
                </button>
                <button className="button" onClick={() => void refreshAfter(api.markDraftReady(selectedDraft.id))}>
                  Mark review-ready
                </button>
              </div>
            }
          >
            <div className="detail-list">
              <div>
                <strong>Status</strong>
                <span>
                  <StatusBadge value={selectedDraft.status} />
                </span>
              </div>
              <div>
                <strong>Readiness score</strong>
                <span>{selectedDraft.readinessScore}</span>
              </div>
              <div>
                <strong>Meta title</strong>
                <span>{selectedDraft.metaTitle}</span>
              </div>
              <div>
                <strong>Meta description</strong>
                <span>{selectedDraft.metaDescription}</span>
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

            <div className="faq-block">
              <h3>FAQ</h3>
              {selectedDraft.faqJson.map((item) => (
                <article key={item.question} className="faq-item">
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>

            <div className="article-preview" dangerouslySetInnerHTML={{ __html: selectedDraft.articleHtml }} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
