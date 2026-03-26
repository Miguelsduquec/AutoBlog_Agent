import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../api/client";
import { useAsyncData } from "../hooks/useAsyncData";
import { formatDate } from "../utils/format";
import { Website } from "../types";

export function DashboardPage() {
  const dashboardQuery = useAsyncData(api.getDashboard, []);
  const websitesQuery = useAsyncData(api.getWebsites, []);

  if (dashboardQuery.loading || websitesQuery.loading) {
    return <div className="state-card">Loading dashboard…</div>;
  }

  if (dashboardQuery.error || websitesQuery.error || !dashboardQuery.data || !websitesQuery.data) {
    return <div className="state-card error">Unable to load dashboard data.</div>;
  }

  const websiteMap = new Map<string, Website>(websitesQuery.data.map((website) => [website.id, website]));

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Autoblog operations overview</h1>
          <p>Monitor website coverage, content generation velocity, and review-ready output from one place.</p>
        </div>
        <Link className="button" to="/app/websites">
          Add website
        </Link>
      </div>

      <div className="metrics-grid">
        <MetricCard title="Websites" value={dashboardQuery.data.totals.websites} help="Tracked domains in the workspace" />
        <MetricCard
          title="Analysis Runs"
          value={dashboardQuery.data.totals.analysisRuns}
          help="Website analyses stored in the system"
        />
        <MetricCard title="Drafts" value={dashboardQuery.data.totals.drafts} help="Generated articles across all websites" />
        <MetricCard
          title="Pending Review"
          value={dashboardQuery.data.totals.pendingReview}
          help="Drafts waiting for a human pass"
        />
        <MetricCard
          title="Automation Runs"
          value={dashboardQuery.data.totals.automationRuns}
          help="Scheduled or manual runs tracked with logs"
        />
      </div>

      <div className="grid-two">
        <SectionCard title="Recent analysis runs" description="Latest website analysis activity and inferred coverage.">
          {dashboardQuery.data.recentAnalysisRuns.length === 0 ? (
            <EmptyState title="No analysis runs yet" description="Analyze a website to populate this view." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {dashboardQuery.data.recentAnalysisRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{websiteMap.get(run.websiteId)?.name ?? run.websiteId}</td>
                    <td>{run.analyzedPageCount}</td>
                    <td>
                      <StatusBadge value={run.status} />
                    </td>
                    <td>{formatDate(run.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Latest automation runs" description="Track pipeline execution across websites.">
          {dashboardQuery.data.latestAutomationRuns.length === 0 ? (
            <EmptyState title="No automation runs yet" description="Trigger a workflow run to see progress here." />
          ) : (
            <div className="stack-list">
              {dashboardQuery.data.latestAutomationRuns.map((run) => (
                <article className="list-card" key={run.id}>
                  <div className="list-card-top">
                    <strong>{websiteMap.get(run.websiteId)?.name ?? run.websiteId}</strong>
                    <StatusBadge value={run.status} />
                  </div>
                  <p>{run.outputSummary}</p>
                  <small>{formatDate(run.createdAt)}</small>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Top opportunities snapshot" description="High-priority topics that are closest to planning and drafting.">
        {dashboardQuery.data.topOpportunities.length === 0 ? (
          <EmptyState title="No opportunities yet" description="Run opportunity discovery on a website to populate this list." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Website</th>
                <th>Cluster</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardQuery.data.topOpportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <td>{opportunity.keyword}</td>
                  <td>{websiteMap.get(opportunity.websiteId)?.name ?? opportunity.websiteId}</td>
                  <td>{opportunity.cluster}</td>
                  <td>
                    <StatusBadge value={opportunity.priority} />
                  </td>
                  <td>
                    <StatusBadge value={opportunity.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
