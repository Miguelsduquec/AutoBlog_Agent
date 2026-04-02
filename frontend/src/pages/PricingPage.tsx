import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../access/AccessContext";
import { api } from "../api/client";
import { GlobalHeader } from "../components/GlobalHeader";

export function PricingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, refreshAuth, loading, logout } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const checkoutRefreshAttempted = useRef(false);
  const next = new URLSearchParams(location.search).get("next") || "/app/dashboard";
  const checkoutState = useMemo(() => new URLSearchParams(location.search).get("checkout") || "", [location.search]);

  if (!loading && auth.isAuthenticated && auth.hasActiveSubscription) {
    return <Navigate replace to={next} />;
  }

  useEffect(() => {
    if ((checkoutState !== "success" && checkoutState !== "mock") || checkoutRefreshAttempted.current) {
      return;
    }

    checkoutRefreshAttempted.current = true;
    void handleRefreshStatus(true);
  }, [checkoutState]);

  async function handleCheckout() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const session = await api.createCheckoutSession();
      const snapshot = await refreshAuth();
      if (snapshot.hasActiveSubscription) {
        setMessage("Subscription active. Opening the app now.");
        navigate(next, { replace: true });
        return;
      }

      if (session.url.startsWith(window.location.origin)) {
        const checkoutUrl = new URL(session.url);
        if (!checkoutUrl.searchParams.has("next")) {
          checkoutUrl.searchParams.set("next", next);
        }

        navigate(`${checkoutUrl.pathname}${checkoutUrl.search}`, { replace: true });
        return;
      }

      window.location.href = session.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshStatus(fromCheckout = false) {
    setError("");

    try {
      const snapshot = await refreshAuth();
      if (snapshot.hasActiveSubscription) {
        setMessage("Subscription active. Opening the app now.");
        return;
      }

      setMessage(fromCheckout ? "Checkout finished, but the subscription is not active yet." : "Subscription is not active yet.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to refresh subscription status.");
    }
  }

  return (
    <div className="unlock-page">
      <GlobalHeader />

      <section className="unlock-shell paywall-shell">
        <div className="unlock-copy">
          <span className="eyebrow">Pricing</span>
          <h1>Autoblog Agent monthly</h1>
          <p>Paid access only. Log in, subscribe, and use the full workflow without trial logic.</p>
          <div className="unlock-benefits">
            <div>
              <strong>Included</strong>
              <p>Websites, analysis, opportunities, plans, drafts, exports, and automation runs.</p>
            </div>
            <div>
              <strong>Best for</strong>
              <p>Businesses, agencies, consultants, and niche site owners who want a real content workflow.</p>
            </div>
          </div>
        </div>

        <div className="unlock-card">
          {error ? <div className="state-card error">{error}</div> : null}
          {message ? <div className="state-card">{message}</div> : null}
          {checkoutState === "mock" ? (
            <div className="state-card">
              Demo billing mode is active. Your subscription is being activated locally.
            </div>
          ) : null}
          {checkoutState === "success" ? (
            <div className="state-card">Checkout completed. We are checking your subscription status.</div>
          ) : null}

          {!auth.isAuthenticated ? (
            <div className="stack-list">
              <h2>Start with an account</h2>
              <p className="muted-copy">Create an account or log in before starting checkout.</p>
              <div className="form-actions">
                <Link className="button" to={`/register?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(next)}`)}`}>
                  Create account
                </Link>
                <Link className="button secondary" to={`/login?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(next)}`)}`}>
                  Log in
                </Link>
              </div>
            </div>
          ) : (
            <div className="stack-list">
              <div className="detail-list">
                <div>
                  <strong>Account</strong>
                  <span>{auth.user?.email}</span>
                </div>
                <div>
                  <strong>Status</strong>
                  <span>{auth.subscription?.status ?? "inactive"}</span>
                </div>
              </div>
              <div className="form-actions">
                <button className="button" disabled={submitting} onClick={() => void handleCheckout()}>
                  {submitting ? "Starting checkout…" : "Start monthly subscription"}
                </button>
                <button className="button secondary" onClick={() => void handleRefreshStatus()}>
                  Refresh status
                </button>
              </div>
              <button className="link-button" onClick={() => void logout()}>
                Log out
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
