import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../access/AccessContext";
import { GlobalHeader } from "../components/GlobalHeader";

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, register, loading } = useAccess();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const next = new URLSearchParams(location.search).get("next") || "/pricing";

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

  return (
    <div className="unlock-page">
      <GlobalHeader />

      <section className="unlock-shell">
        <div className="unlock-copy">
          <span className="eyebrow">Autoblog Agent</span>
          <h1>Create your account</h1>
          <p>Set up your login first, then start the monthly subscription.</p>
        </div>

        <div className="unlock-card">
          {error ? <div className="state-card error">{error}</div> : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="span-2">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="span-2">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="span-2">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
