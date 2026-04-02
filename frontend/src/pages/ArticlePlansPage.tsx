import { useMemo, useState } from "react";
import { useAccessGateRedirect } from "../access/useAccessGateRedirect";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { useAsyncData } from "../hooks/useAsyncData";
import { ArticlePlan, OpportunityIntent, WorkflowStatus } from "../types";
import { formatDate } from "../utils/format";

type PlanStatusFilter = WorkflowStatus | "all";
type PlanIntentFilter = OpportunityIntent | "all";

export function ArticlePlansPage() {
  const handleAccessError = useAccessGateRedirect();
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const plansQuery = useAsyncData(() => api.getPlans(), []);
  const opportunitiesQuery = useAsyncData(() => api.getOpportunities(), []);
  const [websiteFilter, setWebsiteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>("all");
  const [intentFilter, setIntentFilter] = useState<PlanIntentFilter>("all");
  const [selectedPlan, setSelectedPlan] = useState<ArticlePlan | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [draftGenerationId, setDraftGenerationId] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  const websiteMap = useMemo(
    () => new Map((websitesQuery.data ?? []).map((website) => [website.id, website])),
    [websitesQuery.data]
  );
  const opportunityMap = useMemo(
    () => new Map((opportunitiesQuery.data ?? []).map((opportunity) => [opportunity.id, opportunity])),
    [opportunitiesQuery.data]
  );

  if (websitesQuery.loading || plansQuery.loading || opportunitiesQuery.loading) {
    return <div className="state-card">Loading article plans…</div>;
  }

  if (websitesQuery.error || plansQuery.error || opportunitiesQuery.error || !websitesQuery.data || !plansQuery.data || !opportunitiesQuery.data) {
    return <div className="state-card error">Unable to load article plans.</div>;
  }

  const filteredPlans = plansQuery.data.filter((plan) => {
    if (websiteFilter !== "all" && plan.websiteId !== websiteFilter) {
      return false;
    }
    if (statusFilter !== "all" && plan.status !== statusFilter) {
      return false;
    }
    if (intentFilter !== "all" && plan.searchIntent !== intentFilter) {
      return false;
    }

    return true;
  });

  async function openPlan(planId: string) {
    setDetailLoading(true);
    try {
      const plan = await api.getPlan(planId);
      setSelectedPlan(plan);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleBatchGenerate() {
    if (websiteFilter === "all") {
      setGenerationMessage("Select a website to batch-generate plans.");
      return;
    }

    setBatchGenerating(true);
    try {
      const plans = await api.generatePlans(websiteFilter, 5);
      setGenerationMessage(
        plans.length > 0
          ? `Generated ${plans.length} article plans for the selected website.`
          : "No new plans were created for the selected website."
      );
      await plansQuery.refresh();
      if (selectedPlan) {
        const refreshed = await api.getPlan(selectedPlan.id).catch(() => null);
        setSelectedPlan(refreshed);
      }
    } catch (error) {
      if (handleAccessError(error)) {
        return;
      }

      setGenerationMessage(error instanceof Error ? error.message : "Unable to generate plans.");
    } finally {
      setBatchGenerating(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Article plans</h1>
          <p>Shape topics before drafting.</p>
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
          <select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PlanStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="planned">planned</option>
            <option value="drafting">drafting</option>
            <option value="review">review</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
          </select>
          <select aria-label="Intent filter" value={intentFilter} onChange={(event) => setIntentFilter(event.target.value as PlanIntentFilter)}>
            <option value="all">All intents</option>
            <option value="informational">informational</option>
            <option value="commercial">commercial</option>
            <option value="comparison">comparison</option>
            <option value="local">local</option>
          </select>
          <button className="button" disabled={batchGenerating || websiteFilter === "all"} onClick={() => void handleBatchGenerate()}>
            {batchGenerating ? "Generating…" : "Generate plans"}
          </button>
        </div>
      </div>

      {generationMessage ? <div className="state-card">{generationMessage}</div> : null}
      {draftMessage ? <div className="state-card">{draftMessage}</div> : null}

      <SectionCard title="Planning queue" description="Saved plans ready for drafts.">
        {filteredPlans.length === 0 ? (
          <EmptyState title="No article plans yet" description="Generate a plan from an opportunity or batch-generate plans for a website." />
        ) : (
          <TableShell label="Planning queue">
            <thead>
              <tr>
                <th>Title</th>
                <th>Target keyword</th>
                <th>Intent</th>
                <th>Angle</th>
                <th>CTA</th>
                <th>Status</th>
                <th>Website</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.title}</td>
                  <td>{plan.targetKeyword}</td>
                  <td>
                    <StatusBadge value={plan.searchIntent} />
                  </td>
                  <td>{plan.angle}</td>
                  <td>{plan.cta}</td>
                  <td>
                    <StatusBadge value={plan.status} />
                  </td>
                  <td>{websiteMap.get(plan.websiteId)?.name ?? "Unknown website"}</td>
                  <td>{formatDate(plan.createdAt)}</td>
                  <td className="row-actions">
                    <button className="link-button" onClick={() => void openPlan(plan.id)}>
                      View details
                    </button>
                    <button
                      className="link-button"
                      disabled={draftGenerationId === plan.id}
                      onClick={() =>
                        void (async () => {
                          setDraftGenerationId(plan.id);
                          try {
                            const result = await api.generateDraftFromPlan(plan.id);
                            setDraftMessage(result.summaryMessage);
                          } catch (error) {
                            if (handleAccessError(error)) {
                              return;
                            }

                            setDraftMessage(error instanceof Error ? error.message : "Unable to generate the draft.");
                          } finally {
                            setDraftGenerationId("");
                          }
                          await plansQuery.refresh();
                          if (selectedPlan?.id === plan.id) {
                            await openPlan(plan.id);
                          }
                        })()
                      }
                    >
                      {draftGenerationId === plan.id ? "Generating…" : "Generate draft"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <SectionCard
        title={selectedPlan ? "Plan detail" : "Plan detail"}
        description="Review the brief and keywords."
      >
        {detailLoading ? (
          <div className="state-card">Loading plan detail…</div>
        ) : selectedPlan ? (
          <div className="stack-list">
            <div className="detail-list">
              <div>
                <strong>Title</strong>
                <span>{selectedPlan.title}</span>
              </div>
              <div>
                <strong>Search intent</strong>
                <span>{selectedPlan.searchIntent}</span>
              </div>
              <div>
                <strong>Related website</strong>
                <span>{websiteMap.get(selectedPlan.websiteId)?.name ?? "Unknown website"}</span>
              </div>
              <div>
                <strong>Source opportunity</strong>
                <span>
                  {selectedPlan.opportunityId
                    ? opportunityMap.get(selectedPlan.opportunityId)?.topic ?? opportunityMap.get(selectedPlan.opportunityId)?.keyword ?? selectedPlan.opportunityId
                    : "Not linked"}
                </span>
              </div>
            </div>
            <article className="list-card">
              <div className="list-card-top">
                <strong>Brief</strong>
                <StatusBadge value={selectedPlan.status} />
              </div>
              <p>{selectedPlan.brief}</p>
            </article>
            <article className="list-card">
              <div className="list-card-top">
                <strong>Secondary keywords</strong>
              </div>
              <div className="pill-row">
                {selectedPlan.secondaryKeywordsJson.map((keyword) => (
                  <span className="mini-pill" key={keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <EmptyState title="No plan selected" description="Choose a plan to review." />
        )}
      </SectionCard>
    </div>
  );
}
