import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../access/AccessContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { GlobalHeader } from "../components/GlobalHeader";

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, register, loading, loginWithGoogle } = useAccess();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const next = new URLSearchParams(location.search).get("next") || "/pricing";

  if (loading) {
    return (
      <div className="auth-page">
        <GlobalHeader />
        <section className="auth-shell">
          <div className="auth-copy">
            <span className="eyebrow">Autoblog Agent</span>
            <h1>Create your account</h1>
            <p>Checking your account status…</p>
          </div>
          <div className="auth-card">
            <div className="state-card">Checking your current session…</div>
          </div>
        </section>
      </div>
    );
  }

  if (!loading && auth.isAuthenticated) {
    return <Navigate replace to={auth.hasActiveSubscription ? "/app/dashboard" : "/pricing"} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await register({ name, email, password });
      navigate(next, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin(credential: { credential: string; email?: string; name?: string }) {
    setSubmitting(true);
    setError("");

    try {
      await loginWithGoogle(credential);
      navigate(next, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to continue with Google.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <GlobalHeader />

      <section className="auth-shell">
        <div className="auth-copy">
          <span className="eyebrow">Autoblog Agent</span>
          <h1>Create your account</h1>
          <p>Google is the fastest way in. You can also create an account with email and password.</p>
        </div>

        <div className="auth-card">
          {error ? <div className="state-card error">{error}</div> : null}

          <div className="auth-method-stack">
            <GoogleSignInButton
              disabled={submitting}
              email={email}
              name={name}
              onAuthenticate={handleGoogleLogin}
              onError={setError}
            />
            <div className="auth-divider">
              <span>or use email</span>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="span-2">
              Name
              <input disabled={submitting} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="span-2">
              Email
              <input disabled={submitting} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="span-2">
              Password
              <input disabled={submitting} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="form-actions span-2">
              <button className="button" disabled={submitting} type="submit">
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>

          <p className="muted-copy">
            Already registered? <Link className="text-link" to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
