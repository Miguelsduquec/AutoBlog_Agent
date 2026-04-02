import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccess } from "../access/AccessContext";

type GlobalHeaderProps = {
  inApp?: boolean;
};

function sectionHref(inApp: boolean, sectionId: string): string {
  return inApp ? `/#${sectionId}` : `#${sectionId}`;
}

export function GlobalHeader({ inApp = false }: GlobalHeaderProps) {
  const location = useLocation();
  const { auth } = useAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  const appHref = auth.isAuthenticated && auth.hasActiveSubscription ? "/app/dashboard" : "/pricing";
  const appLabel = auth.isAuthenticated && auth.hasActiveSubscription ? "Open app" : "See pricing";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`landing-nav ${inApp ? "app-global-nav" : ""} ${menuOpen ? "open" : ""}`}>
      <Link className="landing-brand" to="/">
        <span className="brand-mark">A</span>
        <span>Autoblog Agent</span>
      </Link>
      <button
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close global navigation" : "Open global navigation"}
        className="nav-toggle global-nav-toggle"
        data-testid="global-nav-toggle"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <div className="landing-nav-links">
        <a href={sectionHref(inApp, "how-it-works")} onClick={() => setMenuOpen(false)}>
          How it works
        </a>
        <a href={sectionHref(inApp, "features")} onClick={() => setMenuOpen(false)}>
          Features
        </a>
        <Link to="/tools/content-gap-grader" onClick={() => setMenuOpen(false)}>
          Free tool
        </Link>
        <a href={sectionHref(inApp, "pricing")} onClick={() => setMenuOpen(false)}>
          Pricing
        </a>
        <Link className="button secondary" to={appHref}>
          {appLabel}
        </Link>
      </div>
    </header>
  );
}
