import { Link } from "react-router-dom";

type GlobalHeaderProps = {
  inApp?: boolean;
};

function sectionHref(inApp: boolean, sectionId: string): string {
  return inApp ? `/#${sectionId}` : `#${sectionId}`;
}

export function GlobalHeader({ inApp = false }: GlobalHeaderProps) {
  return (
    <header className={`landing-nav ${inApp ? "app-global-nav" : ""}`}>
      <Link className="landing-brand" to="/">
        <span className="brand-mark">A</span>
        <span>Autoblog Agent</span>
      </Link>
      <div className="landing-nav-links">
        <a href={sectionHref(inApp, "how-it-works")}>How it works</a>
        <a href={sectionHref(inApp, "features")}>Features</a>
        <Link to="/tools/content-gap-grader">Free tool</Link>
        <a href={sectionHref(inApp, "pricing")}>Pricing</a>
        <Link className="button secondary" to="/app/dashboard">
          Open app
        </Link>
      </div>
    </header>
  );
}
