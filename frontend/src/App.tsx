import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { AnalysisPage } from "./pages/AnalysisPage";
import { AutomationRunsPage } from "./pages/AutomationRunsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DraftStudioPage } from "./pages/DraftStudioPage";
import { ExportCenterPage } from "./pages/ExportCenterPage";
import { LandingPage } from "./pages/LandingPage";
import { OpportunitiesPage } from "./pages/OpportunitiesPage";
import { PlansPage } from "./pages/PlansPage";
import { SeoAuditPage } from "./pages/SeoAuditPage";
import { WebsiteDetailPage } from "./pages/WebsiteDetailPage";
import { WebsitesPage } from "./pages/WebsitesPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate replace to="/app/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="websites" element={<WebsitesPage />} />
        <Route path="websites/:websiteId" element={<WebsiteDetailPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="seo-audit" element={<SeoAuditPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="drafts" element={<DraftStudioPage />} />
        <Route path="automation-runs" element={<AutomationRunsPage />} />
        <Route path="exports" element={<ExportCenterPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
