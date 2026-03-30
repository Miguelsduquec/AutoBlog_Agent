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
          <p>Track the core Phase 1 workflow: websites, analysis coverage, and discovered opportunities.</p>
        </div>
        <Link className="button" to="/app/websites">
          Add website
        </Link>
      </div>

      <div className="metrics-grid four-up">
        <MetricCard title="Websites" value={dashboardQuery.data.totals.websites} help="Tracked domains in the workspace" />
        <MetricCard
          title="Analysis Runs"
          value={dashboardQuery.data.totals.analysisRuns}
          help="Website analyses stored in the system"
        />
        <MetricCard
          title="Analyzed Pages"
          value={dashboardQuery.data.totals.analyzedPages}
          help="Extracted page records stored for website analysis"
        />
        <MetricCard
          title="Opportunities"
          value={dashboardQuery.data.totals.opportunities}
          help="Current topic opportunities ready for prioritization"
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

        <SectionCard title="Website portfolio snapshot" description="Recent websites in the workspace and their latest context.">
          {websitesQuery.data.length === 0 ? (
            <EmptyState title="No websites yet" description="Add your first website to start the Phase 1 workflow." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Market</th>
                  <th>Niche</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {websitesQuery.data.slice(0, 5).map((website) => (
                  <tr key={website.id}>
                    <td>{website.name}</td>
                    <td>
                      {website.language} • {website.targetCountry}
                    </td>
                    <td>{website.niche}</td>
                    <td>{formatDate(website.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Top opportunities snapshot" description="High-priority topics surfaced during Phase 1 discovery.">
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
