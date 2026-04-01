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
export type AutomationRunType = "analyze-only" | "opportunities-only" | "full-pipeline";
export type AutomationStatus = "queued" | "running" | "completed" | "failed" | "partial";
export type OpportunityIntent = "informational" | "commercial" | "comparison" | "local";
export type OpportunityPriority = "low" | "medium" | "high";
export type OpportunityDifficulty = "low" | "medium" | "high";
export type AnalysisConfidenceLevel = "low" | "medium" | "high";

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
  keywordsJson: string[];
  extractedDataJson: ExtractedWebsiteData;
  analyzedPageCount: number;
  confidenceLevel: AnalysisConfidenceLevel;
  confidenceScore: number;
  status: WorkflowStatus;
  createdAt: string;
}

export interface ExtractedWebsiteData {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2Headings: string[];
  mainTextContent: string;
  pageSignals: Array<{
    url: string;
    title: string;
    h1: string;
    pageType: string;
    h2Headings: string[];
    contentExtract: string;
    isFallback?: boolean;
  }>;
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
  topic: string;
  cluster: string;
  intent: OpportunityIntent;
  relevanceScore: number;
  estimatedDifficulty: OpportunityDifficulty;
  priority: OpportunityPriority;
  source: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface OpportunityGenerationResult {
  createdOpportunities: ContentOpportunity[];
  skippedDuplicatesCount: number;
  summaryMessage: string;
}

export interface ArticlePlan {
  id: string;
  websiteId: string;
  opportunityId: string | null;
  title: string;
  targetKeyword: string;
  secondaryKeywordsJson: string[];
  searchIntent: OpportunityIntent;
  angle: string;
  cta: string;
  brief: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface PlanGenerationResult {
  plan: ArticlePlan;
  skipped: boolean;
  regenerated: boolean;
  summaryMessage: string;
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

export interface DraftGenerationResult {
  draft: Draft;
  skipped: boolean;
  regenerated: boolean;
  summaryMessage: string;
}

export interface AutomationRun {
  id: string;
  websiteId: string;
  runType: AutomationRunType;
  status: AutomationStatus;
  logsJson: string[];
  outputSummary: AutomationRunSummary;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRunSummary {
  analysisCreated: boolean;
  opportunitiesCreated: number;
  plansCreated: number;
  draftsCreated: number;
  exportsCreated: number;
  skippedItems: number;
  errors: string[];
  outputIds: {
    opportunityIds: string[];
    planIds: string[];
    draftIds: string[];
    exportJobIds: string[];
  };
  message: string;
}

export interface AutomationRunRequest {
  runType: AutomationRunType;
  maxOpportunities?: number;
  generateDrafts?: boolean;
  exportDrafts?: boolean;
}

export interface ExportJob {
  id: string;
  websiteId: string;
  draftId: string;
  exportPath: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface ExportGenerationResult {
  exportJob: ExportJob;
  exportPath: string;
  files: string[];
  skipped: boolean;
  regenerated: boolean;
  summaryMessage: string;
}

export interface ExportJobDetail {
  exportJob: ExportJob;
  files: string[];
  draft: Draft | null;
  articlePlan: ArticlePlan | null;
  website: Website | null;
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
    analyzedPages: number;
    opportunities: number;
  };
  recentAnalysisRuns: WebsiteAnalysisRun[];
  topOpportunities: ContentOpportunity[];
}

export interface WebsiteInput {
  name: string;
  domain: string;
  language: string;
  targetCountry: string;
  niche: string;
  tone: string;
  contentGoal: string;
  publishingFrequency: string;
}

export interface OpportunityInput {
  websiteId: string;
  keyword: string;
  topic: string;
  cluster: string;
  intent: OpportunityIntent;
  relevanceScore: number;
  estimatedDifficulty: OpportunityDifficulty;
  priority: OpportunityPriority;
  source: string;
  status: WorkflowStatus;
}

export interface ContentGapIdea {
  keyword: string;
  topic: string;
  cluster: string;
  intent: OpportunityIntent;
  priority: OpportunityPriority;
  relevanceScore: number;
  estimatedDifficulty: OpportunityDifficulty;
  whyItMatters: string;
}

export interface ContentGapGraderScores {
  overallScore: number;
  gradeLabel: string;
  contentCoverageScore: number;
  blogMomentumScore: number;
  topicGapCount: number;
  commercialIntentCoverage: number;
  freshnessScore: number;
}

export interface ContentGapGraderReport {
  websiteUrl: string;
  hostname: string;
  websiteName: string;
  nicheSummary: string;
  overview: string;
  extractedKeywords: string[];
  analyzedPageCount: number;
  analysisConfidenceLevel: AnalysisConfidenceLevel;
  analysisConfidenceScore: number;
  analyzedPages: Array<{
    url: string;
    title: string;
    pageType: string;
  }>;
  scores: ContentGapGraderScores;
  topMissingOpportunities: ContentGapIdea[];
  quickWinIdeas: ContentGapIdea[];
  generatedAt: string;
  shareMessage: string;
}
