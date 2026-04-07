import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../access/AccessContext";
import { api } from "../api/client";
import { GlobalHeader } from "../components/GlobalHeader";
import { BillingPlan } from "../types";

function normalizePlan(value: string | null): BillingPlan {
  return value === "yearly" ? "yearly" : "monthly";
}

export function PricingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, refreshAuth, loading, logout } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const checkoutRefreshAttempted = useRef(false);
  const next = new URLSearchParams(location.search).get("next") || "/app/dashboard";
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const checkoutState = searchParams.get("checkout") || "";
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(() => normalizePlan(searchParams.get("plan")));

  if (loading) {
    return (
      <div className="auth-page">
        <GlobalHeader />
        <section className="auth-shell pricing-shell">
          <div className="auth-copy">
            <span className="eyebrow">Pricing</span>
            <h1>Paid subscription only</h1>
            <p>Checking your account and subscription state…</p>
          </div>
          <div className="auth-card">
            <div className="state-card">Loading pricing and subscription status…</div>
          </div>
        </section>
      </div>
    );
  }

  if (!loading && auth.isAuthenticated && auth.hasActiveSubscription) {
    return <Navigate replace to={next} />;
  }

  useEffect(() => {
    setSelectedPlan(normalizePlan(searchParams.get("plan")));
  }, [searchParams]);

  useEffect(() => {
    if ((checkoutState !== "success" && checkoutState !== "mock") || checkoutRefreshAttempted.current) {
      return;
    }

    checkoutRefreshAttempted.current = true;
    void handleRefreshStatus(true);
  }, [checkoutState]);

  function selectPlan(plan: BillingPlan) {
    setSelectedPlan(plan);
    const nextSearch = new URLSearchParams(location.search);
    nextSearch.set("plan", plan);
    navigate(`${location.pathname}?${nextSearch.toString()}`, { replace: true });
  }

  async function handleCheckout(plan: BillingPlan) {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const session = await api.createCheckoutSession({ plan });
      const snapshot = await refreshAuth();
      if (snapshot.hasActiveSubscription) {
        setMessage(plan === "yearly" ? "Annual subscription active. Opening the app now." : "Monthly subscription active. Opening the app now.");
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
        navigate(next, { replace: true });
        return;
      }

      setMessage(
        fromCheckout
          ? "Payment finished, but the subscription is still being confirmed. Try refreshing in a moment."
          : "Subscription is not active yet."
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to refresh subscription status.");
    }
  }

  const planDescription =
    selectedPlan === "yearly"
      ? "Yearly billing with a 10% discount."
      : "Monthly billing with full access to the product.";
  const registerHref = `/register?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(next)}&plan=${selectedPlan}`)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(next)}&plan=${selectedPlan}`)}`;

  return (
    <div className="auth-page">
      <GlobalHeader />

      <section className="auth-shell pricing-shell">
        <div className="auth-copy">
          <span className="eyebrow">Pricing</span>
          <h1>Paid subscription only</h1>
          <p>Choose monthly or yearly billing, complete checkout, and then use the full Autoblog Agent app.</p>
          <div className="pricing-plan-grid">
            <button
              className={`pricing-plan-card ${selectedPlan === "monthly" ? "active" : ""}`}
              data-testid="pricing-plan-monthly"
              onClick={() => selectPlan("monthly")}
              type="button"
            >
              <span className="eyebrow">Monthly</span>
              <strong>€99 / month</strong>
              <p>Flexible monthly billing.</p>
            </button>
            <button
              className={`pricing-plan-card ${selectedPlan === "yearly" ? "active" : ""}`}
              data-testid="pricing-plan-yearly"
              onClick={() => selectPlan("yearly")}
              type="button"
            >
              <span className="eyebrow">Yearly</span>
              <strong>€1,069 / year</strong>
              <p>Save 10% with annual billing.</p>
            </button>
          </div>
          <div className="pricing-benefits">
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

        <div className="auth-card">
          {error ? <div className="state-card error">{error}</div> : null}
          {message ? <div className="state-card">{message}</div> : null}
          {checkoutState === "cancelled" ? (
            <div className="state-card warning">
              Checkout was cancelled. Your account is still available and you can start again any time.
            </div>
          ) : null}
          {checkoutState === "mock" ? (
            <div className="state-card">
              Demo billing mode is active. The selected subscription is being activated locally.
            </div>
          ) : null}
          {checkoutState === "success" ? (
            <div className="state-card">Payment completed. We are checking your subscription and will send you into the app as soon as it is active.</div>
          ) : null}

          {!auth.isAuthenticated ? (
            <div className="stack-list">
              <h2>Start with an account</h2>
              <p className="muted-copy">{planDescription}</p>
              {checkoutState === "success" ? (
                <div className="state-card">
                  Payment completed. Log in with the same account email to continue into Autoblog Agent.
                </div>
              ) : null}
              <div className="form-actions">
                <Link className="button" to={registerHref}>
                  Create account
                </Link>
                <Link className="button secondary" to={loginHref}>
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
                <div>
                  <strong>Selected plan</strong>
                  <span>{selectedPlan === "yearly" ? "Yearly (10% off)" : "Monthly"}</span>
                </div>
              </div>
              <p className="muted-copy">{planDescription}</p>
              <div className="form-actions">
                <button
                  className="button"
                  data-testid="pricing-checkout-button"
                  disabled={submitting}
                  onClick={() => void handleCheckout(selectedPlan)}
                >
                  {submitting
                    ? "Starting checkout…"
                    : selectedPlan === "yearly"
                      ? "Start yearly subscription"
                      : "Start monthly subscription"}
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
