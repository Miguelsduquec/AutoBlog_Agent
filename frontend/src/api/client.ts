import {
  ArticlePlan,
  AutomationRun,
  ContentOpportunity,
  DashboardSnapshot,
  Draft,
  ExportJob,
  OpportunityInput,
  SeoAuditRun,
  Website,
  WebsitePage,
  WebsiteAnalysisRun,
  WebsiteDetail,
  WebsiteInput
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withQuery(path: string, websiteId?: string): string {
  if (!websiteId) {
    return path;
  }

  const query = new URLSearchParams({ websiteId });
  return `${path}?${query.toString()}`;
}

export const api = {
  getDashboard: () => request<DashboardSnapshot>("/dashboard"),
  getWebsites: () => request<Website[]>("/websites"),
  getWebsiteDetail: (websiteId: string) => request<WebsiteDetail>(`/websites/${websiteId}`),
  createWebsite: (payload: WebsiteInput) =>
    request<Website>("/websites", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateWebsite: (websiteId: string, payload: WebsiteInput) =>
    request<Website>(`/websites/${websiteId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteWebsite: (websiteId: string) =>
    request<void>(`/websites/${websiteId}`, {
      method: "DELETE"
    }),
  analyzeWebsite: (websiteId: string) =>
    request<{ analysis: WebsiteAnalysisRun; pages: WebsitePage[] }>(`/websites/${websiteId}/analyze`, {
      method: "POST"
    }),
  getWebsiteAnalyses: (websiteId: string) => request<WebsiteAnalysisRun[]>(`/websites/${websiteId}/analysis`),
  runSeoAudit: (websiteId: string) =>
    request<SeoAuditRun>(`/websites/${websiteId}/audit`, {
      method: "POST"
    }),
  getWebsiteAudits: (websiteId: string) => request<SeoAuditRun[]>(`/websites/${websiteId}/audits`),
  getOpportunities: (websiteId?: string) => request<ContentOpportunity[]>(withQuery("/opportunities", websiteId)),
  createOpportunity: (payload: OpportunityInput) =>
    request<ContentOpportunity>("/opportunities", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateOpportunity: (opportunityId: string, payload: OpportunityInput) =>
    request<ContentOpportunity>(`/opportunities/${opportunityId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  generateOpportunities: (websiteId: string, limit = 8) =>
    request<ContentOpportunity[]>(`/websites/${websiteId}/opportunities/generate`, {
      method: "POST",
      body: JSON.stringify({ limit })
    }),
  generatePlanFromOpportunity: (opportunityId: string) =>
    request<ArticlePlan>(`/opportunities/${opportunityId}/generate-plan`, {
      method: "POST"
    }),
  getPlans: (websiteId?: string) => request<ArticlePlan[]>(withQuery("/plans", websiteId)),
  generatePlans: (websiteId: string, limit = 5) =>
    request<ArticlePlan[]>(`/websites/${websiteId}/plans/generate`, {
      method: "POST",
      body: JSON.stringify({ limit })
    }),
  getDrafts: (websiteId?: string) => request<Draft[]>(withQuery("/drafts", websiteId)),
  getDraft: (draftId: string) => request<Draft>(`/drafts/${draftId}`),
  generateDraftFromPlan: (planId: string) =>
    request<Draft>(`/plans/${planId}/drafts`, {
      method: "POST"
    }),
  generateDraftBatch: (websiteId: string, limit = 3) =>
    request<Draft[]>(`/websites/${websiteId}/drafts/generate`, {
      method: "POST",
      body: JSON.stringify({ limit })
    }),
  regenerateDraft: (draftId: string, section: "outline" | "body" | "meta" | "faq") =>
    request<Draft>(`/drafts/${draftId}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ section })
    }),
  markDraftReady: (draftId: string) =>
    request<Draft>(`/drafts/${draftId}/mark-ready`, {
      method: "POST"
    }),
  getAutomationRuns: (websiteId?: string) =>
    request<AutomationRun[]>(withQuery("/automation-runs", websiteId)),
  triggerAutomationRun: (websiteId: string, runType: string, targetDraftCount = 2) =>
    request<AutomationRun>(`/websites/${websiteId}/automation-runs/trigger`, {
      method: "POST",
      body: JSON.stringify({ runType, targetDraftCount })
    }),
  getExports: (websiteId?: string) => request<ExportJob[]>(withQuery("/exports", websiteId)),
  createExport: (draftId: string) =>
    request<ExportJob>(`/drafts/${draftId}/export`, {
      method: "POST"
    })
};
