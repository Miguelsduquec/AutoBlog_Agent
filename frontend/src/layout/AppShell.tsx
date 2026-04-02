import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAccess } from "../access/AccessContext";
import { GlobalHeader } from "../components/GlobalHeader";

const navigation = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Websites", to: "/app/websites" },
  { label: "Analysis", to: "/app/analysis" },
  { label: "Opportunities", to: "/app/opportunities" },
  { label: "Plans", to: "/app/plans" },
  { label: "Drafts", to: "/app/drafts" },
  { label: "Automation", to: "/app/automation-runs" },
  { label: "Exports", to: "/app/exports" }
];

function resolveTitle(pathname: string): string {
  if (pathname.startsWith("/app/websites/")) {
    return "Website Detail";
  }

  return navigation.find((item) => pathname.startsWith(item.to))?.label ?? "Autoblog Agent";
}

export function AppShell() {
  const location = useLocation();
  const { auth, logout } = useAccess();
  const currentTitle = resolveTitle(location.pathname);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell-page">
      <GlobalHeader inApp />

      <div className={`app-layout ${navOpen ? "nav-open" : ""}`}>
        <button
          aria-hidden={!navOpen}
          className={`sidebar-overlay ${navOpen ? "visible" : ""}`}
          onClick={() => setNavOpen(false)}
          tabIndex={navOpen ? 0 : -1}
          type="button"
        />

        <aside className={`sidebar ${navOpen ? "open" : ""}`} aria-label="App navigation">
          <div className="sidebar-head">
            <div className="brand-block">
              <div className="brand-mark">A</div>
              <div>
                <div className="brand-title">Autoblog Agent</div>
                <div className="brand-subtitle">SEO automation operations</div>
              </div>
            </div>
            <button
              aria-label="Close app navigation"
              className="nav-toggle sidebar-close"
              data-testid="sidebar-close-button"
              onClick={() => setNavOpen(false)}
              type="button"
            >
              Close
            </button>
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
            <strong>Review before export</strong>
          </div>
        </aside>

        <div className="content-frame">
          <header className="topbar">
            <div className="topbar-main">
              <h1>{currentTitle}</h1>
            </div>
            <div className="topbar-meta">
              <div className="topbar-actions">
                <span className="topbar-pill">Subscription active</span>
                <span className="topbar-pill muted">{auth.user?.email}</span>
                <Link className="button secondary" to="/pricing">
                  Billing
                </Link>
                <button className="button secondary" onClick={() => void logout()} type="button">
                  Log out
                </button>
              </div>
              <button
                aria-expanded={navOpen}
                aria-label={navOpen ? "Close app navigation" : "Open app navigation"}
                className="nav-toggle app-nav-toggle"
                data-testid="app-nav-toggle"
                onClick={() => setNavOpen((current) => !current)}
                type="button"
              >
                {navOpen ? "Close menu" : "Menu"}
              </button>
            </div>
          </header>

          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
