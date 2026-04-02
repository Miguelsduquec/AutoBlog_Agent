import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
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
          <h1>Dashboard</h1>
          <p>See what needs attention.</p>
        </div>
        <Link className="button" to="/app/websites">
          Add website
        </Link>
      </div>

      <div className="metrics-grid four-up">
        <MetricCard title="Websites" value={dashboardQuery.data.totals.websites} help="Sites in this workspace" />
        <MetricCard
          title="Analysis Runs"
          value={dashboardQuery.data.totals.analysisRuns}
          help="Completed analysis runs"
        />
        <MetricCard
          title="Analyzed Pages"
          value={dashboardQuery.data.totals.analyzedPages}
          help="Pages used for context"
        />
        <MetricCard
          title="Opportunities"
          value={dashboardQuery.data.totals.opportunities}
          help="Topics ready to review"
        />
      </div>

      <div className="grid-two">
        <SectionCard title="Recent analysis" description="Latest runs.">
          {dashboardQuery.data.recentAnalysisRuns.length === 0 ? (
            <EmptyState title="No analysis runs yet" description="Analyze a website to populate this view." />
          ) : (
            <TableShell label="Recent analysis runs">
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
            </TableShell>
          )}
        </SectionCard>

        <SectionCard title="Websites" description="Recent sites.">
          {websitesQuery.data.length === 0 ? (
            <EmptyState title="No websites yet" description="Add your first website to start the Phase 1 workflow." />
          ) : (
            <TableShell label="Website portfolio snapshot">
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
            </TableShell>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Top opportunities" description="Best topics to act on next.">
        {dashboardQuery.data.topOpportunities.length === 0 ? (
          <EmptyState title="No opportunities yet" description="Run opportunity discovery on a website to populate this list." />
        ) : (
          <TableShell label="Top opportunities snapshot">
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
          </TableShell>
        )}
      </SectionCard>
    </div>
  );
}
