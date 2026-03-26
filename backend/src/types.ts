export type WorkflowStatus =
  | "new"
  | "analyzing"
  | "analyzed"
  | "planned"
  | "drafting"
  | "review"
  | "ready"
  | "exported"
  | "failed";

export type AutomationStatus = "queued" | "running" | "completed" | "failed";

export interface Website {
  id: string;
  name: string;
  domain: string;
  language: string;
  targetCountry: string;
  niche: string;
  tone: string;
  contentGoal: string;
  publishingFrequency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePage {
  id: string;
  websiteId: string;
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  headingsJson: string[];
  contentExtract: string;
  pageType: string;
  createdAt: string;
}

export interface WebsiteAnalysisRun {
  id: string;
  websiteId: string;
  nicheSummary: string;
  contentPillarsJson: string[];
  analyzedPageCount: number;
  status: WorkflowStatus;
  createdAt: string;
}

export interface SeoFinding {
  id: string;
  category: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  pageUrl?: string;
  recommendation: string;
}

export interface SeoAuditRun {
  id: string;
  websiteId: string;
  score: number;
  findingsJson: SeoFinding[];
  createdAt: string;
}

export interface ContentOpportunity {
  id: string;
  websiteId: string;
  keyword: string;
  cluster: string;
  intent: string;
  relevanceScore: number;
  estimatedDifficulty: number;
  priority: string;
  source: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface ArticlePlan {
  id: string;
  websiteId: string;
  opportunityId: string | null;
  title: string;
  targetKeyword: string;
  secondaryKeywordsJson: string[];
  angle: string;
  intent: string;
  cta: string;
  brief: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface Draft {
  id: string;
  websiteId: string;
  articlePlanId: string;
  outlineJson: string[];
  articleMarkdown: string;
  articleHtml: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  faqJson: Array<{ question: string; answer: string }>;
  internalLinksJson: Array<{ label: string; url: string; reason: string }>;
  readinessScore: number;
  status: WorkflowStatus;
  createdAt: string;
}

export interface AutomationRun {
  id: string;
  websiteId: string;
  runType: string;
  status: AutomationStatus;
  logsJson: string[];
  outputSummary: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  websiteId: string;
  draftId: string;
  exportPath: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface WebsiteDetail {
  website: Website;
  pages: WebsitePage[];
  latestAnalysis: WebsiteAnalysisRun | null;
  latestAudit: SeoAuditRun | null;
  latestOpportunities: ContentOpportunity[];
  latestDrafts: Draft[];
}

export interface DashboardSnapshot {
  totals: {
    websites: number;
    analysisRuns: number;
    drafts: number;
    pendingReview: number;
    automationRuns: number;
  };
  recentAnalysisRuns: WebsiteAnalysisRun[];
  latestAutomationRuns: AutomationRun[];
  topOpportunities: ContentOpportunity[];
}

export interface CrawlResultPage {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  headings: string[];
  contentExtract: string;
  pageType: string;
}
