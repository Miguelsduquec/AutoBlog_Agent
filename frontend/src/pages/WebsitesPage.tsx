import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableShell } from "../components/TableShell";
import { useAsyncData } from "../hooks/useAsyncData";
import { Website, WebsiteInput } from "../types";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const websitesQuery = useAsyncData(api.getWebsites, []);
  const [formState, setFormState] = useState<WebsiteInput>(initialWebsiteForm);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  const websiteCountLabel = useMemo(() => websitesQuery.data?.length ?? 0, [websitesQuery.data]);
  const prefillDomain = searchParams.get("prefillDomain") ?? "";

  useEffect(() => {
    if (!prefillDomain || editingWebsite) {
      return;
    }

    setFormState((current) => ({
      ...current,
      domain: current.domain || prefillDomain,
      name: current.name || new URL(prefillDomain).hostname.replace(/^www\./, "").split(".")[0]
    }));
  }, [editingWebsite, prefillDomain]);

  function beginEdit(website: Website) {
    setEditingWebsite(website);
    setFormState({
      name: website.name,
      domain: website.domain,
      language: website.language,
      targetCountry: website.targetCountry,
      niche: website.niche,
      tone: website.tone,
      contentGoal: website.contentGoal,
      publishingFrequency: website.publishingFrequency
    });
  }

  function resetForm() {
    setEditingWebsite(null);
    setFormState(initialWebsiteForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      if (editingWebsite) {
        await api.updateWebsite(editingWebsite.id, formState);
      } else {
        await api.createWebsite(formState);
        if (prefillDomain) {
          searchParams.delete("prefillDomain");
          setSearchParams(searchParams, { replace: true });
        }
      }

      resetForm();
      await websitesQuery.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the website.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(website: Website) {
    const confirmed = window.confirm(`Delete ${website.name}? This will remove its saved data from this workspace.`);
    if (!confirmed) {
      return;
    }

    await api.deleteWebsite(website.id);
    if (editingWebsite?.id === website.id) {
      resetForm();
    }
    await websitesQuery.refresh();
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
          <h1>Websites</h1>
          <p>Add a website to get started.</p>
        </div>
        <div className="topbar-pill">{websiteCountLabel} websites</div>
      </div>

      {formError ? <div className="state-card error">{formError}</div> : null}

      <div className="grid-two wide-right">
        <SectionCard title="Tracked websites" description="All saved websites.">
          {websitesQuery.data.length === 0 ? (
            <EmptyState title="No websites added yet" description="Add your first website to get started." />
          ) : (
            <TableShell label="Tracked websites">
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Domain</th>
                  <th>Market</th>
                  <th>Niche</th>
                  <th>Publishing</th>
                  <th>Updated</th>
                  <th />
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
                    <td className="row-actions">
                      <button className="link-button" onClick={() => beginEdit(website)}>
                        Edit
                      </button>
                      <button className="link-button destructive" onClick={() => void handleDelete(website)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </SectionCard>

        <SectionCard
          title={editingWebsite ? "Edit website" : "Add website"}
          description="Basic setup for one website."
        >
          <form className="form-grid" data-testid="website-form" onSubmit={handleSubmit}>
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
            <div className="form-actions span-2">
              <button className="button" data-testid="website-submit" disabled={submitting} type="submit">
                {submitting ? (editingWebsite ? "Saving…" : "Adding website…") : editingWebsite ? "Save changes" : "Add website"}
              </button>
              {editingWebsite ? (
                <button className="button secondary" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
