import {
  AuthResponse,
  AuthSnapshot,
  ArticlePlan,
  BillingCheckoutInput,
  BillingCheckoutSession,
  ContentGapGraderReport,
  AutomationRun,
  AutomationRunRequest,
  ContentOpportunity,
  DashboardSnapshot,
  Draft,
  DraftGenerationResult,
  ExportGenerationResult,
  ExportJob,
  ExportJobDetail,
  GoogleAuthInput,
  LoginInput,
  OpportunityGenerationResult,
  OpportunityInput,
  PlanGenerationResult,
  RegisterInput,
  SeoAuditRun,
  Website,
  WebsitePage,
  WebsiteAnalysisRun,
  WebsiteDetail,
  WebsiteInput
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";
let currentSessionToken: string | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function setApiSessionToken(sessionToken: string | null) {
  currentSessionToken = sessionToken;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(currentSessionToken ? { Authorization: `Bearer ${currentSessionToken}` } : {}),
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new ApiError(error.message ?? "Request failed.", response.status, error.code);
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
  getSession: () => request<AuthSnapshot>("/auth/session"),
  register: (payload: RegisterInput) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload: LoginInput) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  googleLogin: (payload: GoogleAuthInput) =>
    request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () =>
    request<void>("/auth/logout", {
      method: "POST"
    }),
  createCheckoutSession: (payload: BillingCheckoutInput = {}) =>
    request<BillingCheckoutSession>("/billing/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
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
  deleteOpportunity: (opportunityId: string) =>
    request<void>(`/opportunities/${opportunityId}`, {
      method: "DELETE"
    }),
  generateOpportunities: (websiteId: string, limit = 8) =>
    request<OpportunityGenerationResult>(`/websites/${websiteId}/generate-opportunities`, {
      method: "POST",
      body: JSON.stringify({ limit })
    }),
  generatePlanFromOpportunity: (opportunityId: string) =>
    request<PlanGenerationResult>(`/opportunities/${opportunityId}/generate-plan`, {
      method: "POST"
    }),
  getPlans: (websiteId?: string) => request<ArticlePlan[]>(withQuery("/article-plans", websiteId)),
  getPlan: (planId: string) => request<ArticlePlan>(`/article-plans/${planId}`),
  generatePlans: (websiteId: string, limit = 5) =>
    request<ArticlePlan[]>(`/websites/${websiteId}/plans/generate`, {
      method: "POST",
      body: JSON.stringify({ limit })
    }),
  getDrafts: (websiteId?: string) => request<Draft[]>(withQuery("/drafts", websiteId)),
  getDraft: (draftId: string) => request<Draft>(`/drafts/${draftId}`),
  generateDraftFromPlan: (planId: string) =>
    request<DraftGenerationResult>(`/article-plans/${planId}/generate-draft`, {
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
  getAutomationRun: (runId: string) => request<AutomationRun>(`/automation-runs/${runId}`),
  triggerAutomationRun: (websiteId: string, payload: AutomationRunRequest) =>
    request<AutomationRun>(`/websites/${websiteId}/run-automation`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getExports: (websiteId?: string) => request<ExportJob[]>(withQuery("/exports", websiteId)),
  getExport: (exportJobId: string) => request<ExportJobDetail>(`/exports/${exportJobId}`),
  createExport: (draftId: string) =>
    request<ExportGenerationResult>(`/drafts/${draftId}/export`, {
      method: "POST"
    }),
  gradeContentGaps: (url: string) =>
    request<ContentGapGraderReport>("/tools/content-gap-grader", {
      method: "POST",
      body: JSON.stringify({ url })
    })
};
