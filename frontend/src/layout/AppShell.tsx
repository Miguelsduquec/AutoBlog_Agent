import { NavLink, Outlet, useLocation } from "react-router-dom";

const navigation = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Websites", to: "/app/websites" },
  { label: "Analysis", to: "/app/analysis" },
  { label: "SEO Audit", to: "/app/seo-audit" },
  { label: "Opportunities", to: "/app/opportunities" },
  { label: "Content Plans", to: "/app/plans" },
  { label: "Draft Studio", to: "/app/drafts" },
  { label: "Automation Runs", to: "/app/automation-runs" },
  { label: "Export Center", to: "/app/exports" }
];

function resolveTitle(pathname: string): string {
  if (pathname.startsWith("/app/websites/")) {
    return "Website Detail";
  }

  return navigation.find((item) => pathname.startsWith(item.to))?.label ?? "Autoblog Agent";
}

export function AppShell() {
  const location = useLocation();
  const currentTitle = resolveTitle(location.pathname);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">Autoblog Agent</div>
            <div className="brand-subtitle">SEO automation operations</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footnote">Human review gate</div>
          <strong>Enabled before export</strong>
        </div>
      </aside>

      <div className="content-frame">
        <header className="topbar">
          <div>
            <div className="eyebrow">Operational workflow</div>
            <h1>{currentTitle}</h1>
          </div>
          <div className="topbar-actions">
            <span className="topbar-pill">Automatic generation</span>
            <span className="topbar-pill muted">Review before publishing</span>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
