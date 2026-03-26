import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { ContentOpportunity, OpportunityInput } from "../types";

const initialOpportunity = (websiteId: string): OpportunityInput => ({
  websiteId,
  keyword: "",
  cluster: "",
  intent: "Informational",
  relevanceScore: 80,
  estimatedDifficulty: 40,
  priority: "medium",
  source: "manual",
  status: "new"
});

export function OpportunitiesPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const opportunitiesQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getOpportunities(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );
  const [formState, setFormState] = useState<OpportunityInput>(initialOpportunity(""));
  const [editing, setEditing] = useState<ContentOpportunity | null>(null);

  useEffect(() => {
    if (selectedWebsiteId) {
      setFormState(initialOpportunity(selectedWebsiteId));
      setEditing(null);
    }
  }, [selectedWebsiteId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editing) {
      await api.updateOpportunity(editing.id, formState);
    } else {
      await api.createOpportunity(formState);
    }

    setFormState(initialOpportunity(selectedWebsiteId));
    setEditing(null);
    await opportunitiesQuery.refresh();
  }

  async function handleGeneratePlan(opportunityId: string) {
    await api.generatePlanFromOpportunity(opportunityId);
    await opportunitiesQuery.refresh();
  }

  if (websitesQuery.loading || opportunitiesQuery.loading) {
    return <div className="state-card">Loading content opportunities…</div>;
  }

  if (websitesQuery.error || opportunitiesQuery.error || !websitesQuery.data || !opportunitiesQuery.data) {
    return <div className="state-card error">Unable to load content opportunities.</div>;
  }

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Content opportunities"
        description="Find niche-relevant topics, track priority, and convert selected opportunities into plans."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <>
            <button
              className="button secondary"
              onClick={() =>
                void (async () => {
                  await api.generateOpportunities(selectedWebsiteId);
                  await opportunitiesQuery.refresh();
                })()
              }
            >
              Discover topics
            </button>
            <button
              className="button"
              onClick={() =>
                void (async () => {
                  await api.generatePlans(selectedWebsiteId, 3);
                  await opportunitiesQuery.refresh();
                })()
              }
            >
              Batch generate plans
            </button>
          </>
        }
      />

      <div className="grid-two wide-right">
        <SectionCard title="Opportunity queue" description="Keyword opportunities inferred from analysis, audits, and manual input.">
          {opportunitiesQuery.data.length === 0 ? (
            <EmptyState title="No opportunities yet" description="Run topic discovery or add one manually." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Keyword / topic</th>
                  <th>Cluster</th>
                  <th>Intent</th>
                  <th>Relevance</th>
                  <th>Difficulty</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {opportunitiesQuery.data.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>{opportunity.keyword}</td>
                    <td>{opportunity.cluster}</td>
                    <td>{opportunity.intent}</td>
                    <td>{opportunity.relevanceScore}</td>
                    <td>{opportunity.estimatedDifficulty}</td>
                    <td>
                      <StatusBadge value={opportunity.priority} />
                    </td>
                    <td>
                      <StatusBadge value={opportunity.status} />
                    </td>
                    <td className="row-actions">
                      <button
                        className="link-button"
                        onClick={() => {
                          setEditing(opportunity);
                          setFormState({
                            websiteId: opportunity.websiteId,
                            keyword: opportunity.keyword,
                            cluster: opportunity.cluster,
                            intent: opportunity.intent,
                            relevanceScore: opportunity.relevanceScore,
                            estimatedDifficulty: opportunity.estimatedDifficulty,
                            priority: opportunity.priority,
                            source: opportunity.source,
                            status: opportunity.status
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button className="link-button" onClick={() => void handleGeneratePlan(opportunity.id)}>
                        Generate plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title={editing ? "Edit opportunity" : "Add opportunity"} description="Manual curation is useful when operators know the niche better than the current template library.">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="span-2">
              Keyword / topic
              <input value={formState.keyword} onChange={(event) => setFormState({ ...formState, keyword: event.target.value })} />
            </label>
            <label>
              Cluster
              <input value={formState.cluster} onChange={(event) => setFormState({ ...formState, cluster: event.target.value })} />
            </label>
            <label>
              Intent
              <select value={formState.intent} onChange={(event) => setFormState({ ...formState, intent: event.target.value })}>
                <option>Informational</option>
                <option>Commercial</option>
              </select>
            </label>
            <label>
              Relevance
              <input
                type="number"
                value={formState.relevanceScore}
                onChange={(event) => setFormState({ ...formState, relevanceScore: Number(event.target.value) })}
              />
            </label>
            <label>
              Difficulty
              <input
                type="number"
                value={formState.estimatedDifficulty}
                onChange={(event) => setFormState({ ...formState, estimatedDifficulty: Number(event.target.value) })}
              />
            </label>
            <label>
              Priority
              <select value={formState.priority} onChange={(event) => setFormState({ ...formState, priority: event.target.value })}>
                <option>high</option>
                <option>medium</option>
                <option>low</option>
              </select>
            </label>
            <label>
              Status
              <select value={formState.status} onChange={(event) => setFormState({ ...formState, status: event.target.value as OpportunityInput["status"] })}>
                <option>new</option>
                <option>planned</option>
                <option>failed</option>
              </select>
            </label>
            <label className="span-2">
              Source
              <input value={formState.source} onChange={(event) => setFormState({ ...formState, source: event.target.value })} />
            </label>
            <div className="form-actions span-2">
              <button className="button" type="submit">
                {editing ? "Save changes" : "Add opportunity"}
              </button>
              {editing ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormState(initialOpportunity(selectedWebsiteId));
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
