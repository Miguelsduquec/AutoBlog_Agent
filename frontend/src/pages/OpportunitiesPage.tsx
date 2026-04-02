import { FormEvent, useEffect, useState } from "react";
import { useAccessGateRedirect } from "../access/useAccessGateRedirect";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";
import { ContentOpportunity, OpportunityDifficulty, OpportunityInput, OpportunityIntent, OpportunityPriority } from "../types";

const initialOpportunity = (websiteId: string): OpportunityInput => ({
  websiteId,
  keyword: "",
  topic: "",
  cluster: "",
  intent: "informational",
  relevanceScore: 80,
  estimatedDifficulty: "medium",
  priority: "medium",
  source: "manual",
  status: "new"
});

export function OpportunitiesPage() {
  const handleAccessError = useAccessGateRedirect();
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const opportunitiesQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getOpportunities(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );
  const [formState, setFormState] = useState<OpportunityInput>(initialOpportunity(""));
  const [editing, setEditing] = useState<ContentOpportunity | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [generationMessage, setGenerationMessage] = useState<string>("");
  const [generationError, setGenerationError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [planGenerationId, setPlanGenerationId] = useState<string>("");
  const [planMessage, setPlanMessage] = useState<string>("");

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
    setPlanGenerationId(opportunityId);
    setGenerationError("");
    try {
      const result = await api.generatePlanFromOpportunity(opportunityId);
      setPlanMessage(result.summaryMessage);
      await opportunitiesQuery.refresh();
    } catch (error) {
      if (handleAccessError(error)) {
        return;
      }

      setGenerationError(error instanceof Error ? error.message : "Unable to generate a plan.");
    } finally {
      setPlanGenerationId("");
    }
  }

  async function handleDelete(opportunity: ContentOpportunity) {
    const confirmed = window.confirm(`Delete opportunity "${opportunity.keyword}"?`);
    if (!confirmed) {
      return;
    }

    await api.deleteOpportunity(opportunity.id);
    if (editing?.id === opportunity.id) {
      setEditing(null);
      setFormState(initialOpportunity(selectedWebsiteId));
    }
    await opportunitiesQuery.refresh();
  }

  if (websitesQuery.loading || opportunitiesQuery.loading) {
    return <div className="state-card">Loading content opportunities…</div>;
  }

  if (websitesQuery.error || opportunitiesQuery.error || !websitesQuery.data || !opportunitiesQuery.data) {
    return <div className="state-card error">Unable to load content opportunities.</div>;
  }

  const sourceOptions = [...new Set(opportunitiesQuery.data.map((opportunity) => opportunity.source))];
  const filteredOpportunities =
    sourceFilter === "all"
      ? opportunitiesQuery.data
      : opportunitiesQuery.data.filter((opportunity) => opportunity.source === sourceFilter);

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Content opportunities"
        description="Find topics and turn the best ones into plans."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <>
            <select aria-label="Source filter" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <button
              className="button secondary"
              data-testid="opportunities-page-generate-button"
              disabled={!selectedWebsiteId || isGenerating}
              onClick={() =>
                void (async () => {
                  setIsGenerating(true);
                  setGenerationError("");
                  try {
                    const result = await api.generateOpportunities(selectedWebsiteId, 10);
                    setGenerationMessage(result.summaryMessage);
                    await opportunitiesQuery.refresh();
                  } catch (error) {
                    setGenerationError(error instanceof Error ? error.message : "Unable to generate opportunities.");
                  } finally {
                    setIsGenerating(false);
                  }
                })()
              }
            >
              {isGenerating ? "Generating…" : "Generate opportunities"}
            </button>
            <button
              className="button"
              onClick={() =>
                void (async () => {
                  try {
                    await api.generatePlans(selectedWebsiteId, 3);
                    await opportunitiesQuery.refresh();
                  } catch (error) {
                    if (handleAccessError(error)) {
                      return;
                    }

                    setGenerationError(error instanceof Error ? error.message : "Unable to batch-generate plans.");
                  }
                })()
              }
            >
              Batch generate plans
            </button>
          </>
        }
      />

      {generationMessage ? <div className="state-card">{generationMessage}</div> : null}
      {generationError ? <div className="state-card error">{generationError}</div> : null}
      {planMessage ? <div className="state-card">{planMessage}</div> : null}

      <div className="grid-two wide-right">
        <SectionCard title="Opportunity queue" description="Saved topics for this website.">
          {filteredOpportunities.length === 0 ? (
            <EmptyState title="No opportunities yet" description="Run topic discovery or add one manually." />
          ) : (
            <TableShell label="Opportunity queue">
              <thead>
                <tr>
                  <th>Keyword / topic</th>
                  <th>Cluster</th>
                  <th>Intent</th>
                  <th>Relevance</th>
                  <th>Difficulty</th>
                  <th>Priority</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>
                      <strong>{opportunity.topic}</strong>
                      <div className="table-subtext">{opportunity.keyword}</div>
                    </td>
                    <td>{opportunity.cluster}</td>
                    <td>
                      <StatusBadge value={opportunity.intent} />
                    </td>
                    <td>{opportunity.relevanceScore}</td>
                    <td>
                      <StatusBadge value={opportunity.estimatedDifficulty} />
                    </td>
                    <td>
                      <StatusBadge value={opportunity.priority} />
                    </td>
                    <td>
                      <StatusBadge value={opportunity.source} />
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
                            topic: opportunity.topic,
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
                      <button
                        className="link-button"
                        disabled={planGenerationId === opportunity.id}
                        onClick={() => void handleGeneratePlan(opportunity.id)}
                      >
                        {planGenerationId === opportunity.id ? "Generating…" : "Generate plan"}
                      </button>
                      <button className="link-button destructive" onClick={() => void handleDelete(opportunity)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </SectionCard>

        <SectionCard title={editing ? "Edit opportunity" : "Add opportunity"} description="Add or update a topic manually.">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="span-2">
              Keyword
              <input value={formState.keyword} onChange={(event) => setFormState({ ...formState, keyword: event.target.value })} />
            </label>
            <label className="span-2">
              Topic
              <input value={formState.topic} onChange={(event) => setFormState({ ...formState, topic: event.target.value })} />
            </label>
            <label>
              Cluster
              <input value={formState.cluster} onChange={(event) => setFormState({ ...formState, cluster: event.target.value })} />
            </label>
            <label>
              Intent
              <select value={formState.intent} onChange={(event) => setFormState({ ...formState, intent: event.target.value as OpportunityIntent })}>
                <option value="informational">informational</option>
                <option value="commercial">commercial</option>
                <option value="comparison">comparison</option>
                <option value="local">local</option>
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
              <select
                value={formState.estimatedDifficulty}
                onChange={(event) => setFormState({ ...formState, estimatedDifficulty: event.target.value as OpportunityDifficulty })}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label>
              Priority
              <select
                value={formState.priority}
                onChange={(event) => setFormState({ ...formState, priority: event.target.value as OpportunityPriority })}
              >
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
