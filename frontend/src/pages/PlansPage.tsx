import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { WebsiteScopeHeader } from "../components/WebsiteScopeHeader";
import { useAsyncData } from "../hooks/useAsyncData";
import { useSelectedWebsite } from "../hooks/useSelectedWebsite";

export function PlansPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [selectedWebsiteId, setSelectedWebsiteId] = useSelectedWebsite(websitesQuery.data);
  const plansQuery = useAsyncData(
    () => (selectedWebsiteId ? api.getPlans(selectedWebsiteId) : Promise.resolve([])),
    [selectedWebsiteId]
  );

  if (websitesQuery.loading || plansQuery.loading) {
    return <div className="state-card">Loading article plans…</div>;
  }

  if (websitesQuery.error || plansQuery.error || !websitesQuery.data || !plansQuery.data) {
    return <div className="state-card error">Unable to load article plans.</div>;
  }

  return (
    <div className="page-stack">
      <WebsiteScopeHeader
        title="Content plans"
        description="Turn article opportunities into concrete briefs, angles, target keywords, and CTAs."
        websites={websitesQuery.data}
        selectedWebsiteId={selectedWebsiteId}
        onSelectWebsite={setSelectedWebsiteId}
        actions={
          <button
            className="button"
            onClick={() =>
              void (async () => {
                await api.generatePlans(selectedWebsiteId);
                await plansQuery.refresh();
              })()
            }
          >
            Generate plans
          </button>
        }
      />

      <SectionCard title="Plan queue" description="Plans connect opportunity research to draft generation.">
        {plansQuery.data.length === 0 ? (
          <EmptyState title="No plans yet" description="Generate plans from discovered opportunities." />
        ) : (
          <div className="stack-list">
            {plansQuery.data.map((plan) => (
              <article className="list-card" key={plan.id}>
                <div className="list-card-top">
                  <strong>{plan.title}</strong>
                  <StatusBadge value={plan.status} />
                </div>
                <p>{plan.brief}</p>
                <div className="detail-list compact">
                  <div>
                    <strong>Target keyword</strong>
                    <span>{plan.targetKeyword}</span>
                  </div>
                  <div>
                    <strong>Intent</strong>
                    <span>{plan.intent}</span>
                  </div>
                  <div>
                    <strong>CTA</strong>
                    <span>{plan.cta}</span>
                  </div>
                </div>
                <div className="pill-row">
                  {plan.secondaryKeywordsJson.map((keyword) => (
                    <span className="mini-pill" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    void (async () => {
                      await api.generateDraftFromPlan(plan.id);
                      await plansQuery.refresh();
                    })()
                  }
                >
                  Generate draft
                </button>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
