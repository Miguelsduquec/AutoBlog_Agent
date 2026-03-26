import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAsyncData } from "../hooks/useAsyncData";
import { WebsiteInput } from "../types";
import { formatDate } from "../utils/format";

const initialWebsiteForm: WebsiteInput = {
  name: "",
  domain: "",
  language: "English",
  targetCountry: "United States",
  niche: "",
  tone: "",
  contentGoal: "",
  publishingFrequency: "Weekly"
};

export function WebsitesPage() {
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [formState, setFormState] = useState<WebsiteInput>(initialWebsiteForm);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const websiteCountLabel = useMemo(() => websitesQuery.data?.length ?? 0, [websitesQuery.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.createWebsite(formState);
      setFormState(initialWebsiteForm);
      await websitesQuery.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (websitesQuery.loading) {
    return <div className="state-card">Loading websites…</div>;
  }

  if (websitesQuery.error || !websitesQuery.data) {
    return <div className="state-card error">Unable to load websites.</div>;
  }

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h1>Website portfolio</h1>
          <p>Manually add websites, define the content strategy context, and open each workflow from one list.</p>
        </div>
        <div className="topbar-pill">{websiteCountLabel} websites</div>
      </div>

      <div className="grid-two wide-right">
        <SectionCard title="Tracked websites" description="Each website becomes its own analysis, opportunity, and drafting workspace.">
          {websitesQuery.data.length === 0 ? (
            <EmptyState title="No websites added yet" description="Add your first website to start the workflow." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Domain</th>
                  <th>Market</th>
                  <th>Niche</th>
                  <th>Publishing</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {websitesQuery.data.map((website) => (
                  <tr key={website.id}>
                    <td>
                      <Link className="table-link" to={`/app/websites/${website.id}`}>
                        {website.name}
                      </Link>
                    </td>
                    <td>{website.domain}</td>
                    <td>
                      {website.language} • {website.targetCountry}
                    </td>
                    <td>{website.niche}</td>
                    <td>
                      <StatusBadge value={website.publishingFrequency} />
                    </td>
                    <td>{formatDate(website.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Add website" description="The first version keeps setup manual so the website context is explicit and reliable.">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Website name
              <input value={formState.name} onChange={(event) => setFormState({ ...formState, name: event.target.value })} />
            </label>
            <label>
              Domain
              <input value={formState.domain} onChange={(event) => setFormState({ ...formState, domain: event.target.value })} />
            </label>
            <label>
              Language
              <input value={formState.language} onChange={(event) => setFormState({ ...formState, language: event.target.value })} />
            </label>
            <label>
              Target country
              <input
                value={formState.targetCountry}
                onChange={(event) => setFormState({ ...formState, targetCountry: event.target.value })}
              />
            </label>
            <label>
              Niche or business type
              <input value={formState.niche} onChange={(event) => setFormState({ ...formState, niche: event.target.value })} />
            </label>
            <label>
              Brand tone
              <input value={formState.tone} onChange={(event) => setFormState({ ...formState, tone: event.target.value })} />
            </label>
            <label className="span-2">
              Content goal
              <textarea
                rows={3}
                value={formState.contentGoal}
                onChange={(event) => setFormState({ ...formState, contentGoal: event.target.value })}
              />
            </label>
            <label className="span-2">
              Publishing frequency
              <select
                value={formState.publishingFrequency}
                onChange={(event) => setFormState({ ...formState, publishingFrequency: event.target.value })}
              >
                <option>Weekly</option>
                <option>Twice per week</option>
                <option>Bi-weekly</option>
                <option>Monthly</option>
              </select>
            </label>
            <button className="button" disabled={submitting} type="submit">
              {submitting ? "Adding website…" : "Add website"}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
