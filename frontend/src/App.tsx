import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAccess } from "./access/AccessContext";
import { AppShell } from "./layout/AppShell";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ArticlePlansPage } from "./pages/ArticlePlansPage";
import { AutomationRunsPage } from "./pages/AutomationRunsPage";
import { ContentGapGraderPage } from "./pages/ContentGapGraderPage";
import { ContentGapGraderResultsPage } from "./pages/ContentGapGraderResultsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DraftsPage } from "./pages/DraftsPage";
import { ExportsPage } from "./pages/ExportsPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { OpportunitiesPage } from "./pages/OpportunitiesPage";
import { PricingPage } from "./pages/PricingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SeoAuditPage } from "./pages/SeoAuditPage";
import { WebsiteDetailPage } from "./pages/WebsiteDetailPage";
import { WebsitesPage } from "./pages/WebsitesPage";

function AppGuard() {
  const { auth, loading } = useAccess();
  const location = useLocation();
  const next = encodeURIComponent(`${location.pathname}${location.search}`);

  if (loading) {
    return <div className="state-card">Checking account…</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace to={`/login?next=${next}`} />;
  }

  if (!auth.hasActiveSubscription) {
    return <Navigate replace to={`/pricing?next=${next}`} />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/tools/content-gap-grader" element={<ContentGapGraderPage />} />
      <Route path="/tools/content-gap-grader/results" element={<ContentGapGraderResultsPage />} />
      <Route path="/app" element={<AppGuard />}>
        <Route index element={<Navigate replace to="/app/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="websites" element={<WebsitesPage />} />
        <Route path="websites/:websiteId" element={<WebsiteDetailPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="seo-audit" element={<SeoAuditPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="plans" element={<ArticlePlansPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="automation-runs" element={<AutomationRunsPage />} />
        <Route path="exports" element={<ExportsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
