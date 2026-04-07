import {
  AnalysisConfidenceLevel,
  ArticlePlan,
  AuthSnapshot,
  AuthUser,
  AutomationRun,
  AutomationRunSummary,
  ContentOpportunity,
  Draft,
  ExtractedWebsiteData,
  ExportJob,
  Subscription,
  SeoAuditRun,
  SubscriptionStatus,
  User,
  UserSession,
  Website,
  WebsiteAnalysisRun,
  WebsitePage
} from "../types";
import { parseJsonArray } from "../utils/json";

type Row = Record<string, unknown>;

const defaultExtractedData: ExtractedWebsiteData = {
  url: "",
  title: "",
  metaDescription: "",
  h1: "",
  h2Headings: [],
  mainTextContent: "",
  pageSignals: []
};

const defaultAutomationSummary: AutomationRunSummary = {
  analysisCreated: false,
  opportunitiesCreated: 0,
  plansCreated: 0,
  draftsCreated: 0,
  exportsCreated: 0,
  skippedItems: 0,
  errors: [],
  outputIds: {
    opportunityIds: [],
    planIds: [],
    draftIds: [],
    exportJobIds: []
  },
  message: ""
};

const defaultAuthSnapshot: AuthSnapshot = {
  isAuthenticated: false,
  hasActiveSubscription: false,
  user: null,
  subscription: null
};

function normalizeDifficulty(value: unknown): ContentOpportunity["estimatedDifficulty"] {
  if (typeof value === "number") {
    if (value >= 60) {
      return "high";
    }
    if (value >= 40) {
      return "medium";
    }
    return "low";
  }

  const normalized = String(value ?? "medium").toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return "medium";
}

function normalizeIntent(value: unknown): ContentOpportunity["intent"] {
  const normalized = String(value ?? "informational").toLowerCase();
  if (normalized === "commercial" || normalized === "comparison" || normalized === "local") {
    return normalized;
  }

  return "informational";
}

function normalizePriority(value: unknown): ContentOpportunity["priority"] {
  const normalized = String(value ?? "medium").toLowerCase();
  if (normalized === "low" || normalized === "high") {
    return normalized;
  }

  return "medium";
}

function normalizeExtractedData(value: unknown): ExtractedWebsiteData {
  if (!value || typeof value !== "object") {
    return defaultExtractedData;
  }

  const record = value as Record<string, unknown>;
  const h2Headings = Array.isArray(record.h2Headings)
    ? record.h2Headings.map((item) => String(item))
    : Array.isArray(record.headings)
      ? record.headings.map((item) => String(item))
      : [];

  return {
    url: String(record.url ?? ""),
    title: String(record.title ?? ""),
    metaDescription: String(record.metaDescription ?? record.meta_description ?? ""),
    h1: String(record.h1 ?? ""),
    h2Headings,
    mainTextContent: String(record.mainTextContent ?? record.contentExtract ?? record.content_extract ?? ""),
    pageSignals: Array.isArray(record.pageSignals)
      ? record.pageSignals
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const signal = item as Record<string, unknown>;
            return {
              url: String(signal.url ?? ""),
              title: String(signal.title ?? ""),
              h1: String(signal.h1 ?? ""),
              pageType: String(signal.pageType ?? signal.page_type ?? "page"),
              h2Headings: Array.isArray(signal.h2Headings)
                ? signal.h2Headings.map((heading) => String(heading))
                : [],
              contentExtract: String(signal.contentExtract ?? signal.content_extract ?? "")
            };
          })
      : []
  };
}

function normalizeConfidenceLevel(value: unknown): AnalysisConfidenceLevel {
  const normalized = String(value ?? "low").toLowerCase();
  if (normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return "low";
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const normalized = String(value ?? "inactive").toLowerCase();
  if (normalized === "trialing") {
    return "active";
  }

  if (normalized === "active" || normalized === "past_due" || normalized === "canceled" || normalized === "unpaid") {
    return normalized;
  }

  return "inactive";
}

function normalizeAutomationSummary(value: unknown): AutomationRunSummary {
  if (typeof value === "string") {
    return {
      ...defaultAutomationSummary,
      message: value
    };
  }

  if (!value || typeof value !== "object") {
    return defaultAutomationSummary;
  }

  const record = value as Record<string, unknown>;
  const outputIds = record.outputIds as Record<string, unknown> | undefined;

  return {
    analysisCreated: Boolean(record.analysisCreated),
    opportunitiesCreated: Number(record.opportunitiesCreated ?? 0),
    plansCreated: Number(record.plansCreated ?? 0),
    draftsCreated: Number(record.draftsCreated ?? 0),
    exportsCreated: Number(record.exportsCreated ?? 0),
    skippedItems: Number(record.skippedItems ?? 0),
    errors: Array.isArray(record.errors) ? record.errors.map((item) => String(item)) : [],
    outputIds: {
      opportunityIds: Array.isArray(outputIds?.opportunityIds)
        ? outputIds.opportunityIds.map((item) => String(item))
        : [],
      planIds: Array.isArray(outputIds?.planIds) ? outputIds.planIds.map((item) => String(item)) : [],
      draftIds: Array.isArray(outputIds?.draftIds) ? outputIds.draftIds.map((item) => String(item)) : [],
      exportJobIds: Array.isArray(outputIds?.exportJobIds)
        ? outputIds.exportJobIds.map((item) => String(item))
        : []
    },
    message: String(record.message ?? "")
  };
}

export function mapWebsite(row: Row): Website {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ""),
    name: String(row.name),
    domain: String(row.domain),
    language: String(row.language),
    targetCountry: String(row.target_country),
    niche: String(row.niche),
    tone: String(row.tone),
    contentGoal: String(row.content_goal),
    publishingFrequency: String(row.publishing_frequency),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function mapUser(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    passwordHash: row.password_hash == null ? null : String(row.password_hash),
    googleSub: String(row.google_sub ?? ""),
    stripeCustomerId: String(row.stripe_customer_id ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function mapAuthUser(row: Row): AuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function mapUserSession(row: Row): UserSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    token: String(row.token),
    createdAt: String(row.created_at),
    lastSeenAt: String(row.last_seen_at ?? row.created_at)
  };
}

export function mapSubscription(row: Row): Subscription {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    stripeCustomerId: String(row.stripe_customer_id ?? ""),
    stripeSubscriptionId: String(row.stripe_subscription_id ?? ""),
    stripePriceId: String(row.stripe_price_id ?? ""),
    stripeCheckoutSessionId: String(row.stripe_checkout_session_id ?? ""),
    status: normalizeSubscriptionStatus(row.status),
    currentPeriodEnd: String(row.current_period_end ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function mapWebsitePage(row: Row): WebsitePage {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    url: String(row.url),
    title: String(row.title),
    metaDescription: String(row.meta_description),
    h1: String(row.h1),
    headingsJson: parseJsonArray<string[]>(String(row.headings_json ?? "[]"), []),
    contentExtract: String(row.content_extract),
    pageType: String(row.page_type),
    createdAt: String(row.created_at)
  };
}

export function mapAnalysisRun(row: Row): WebsiteAnalysisRun {
  const extractedData = parseJsonArray<Record<string, unknown>>(String(row.extracted_data_json ?? "{}"), {});

  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    nicheSummary: String(row.niche_summary),
    contentPillarsJson: parseJsonArray<string[]>(String(row.content_pillars_json ?? "[]"), []),
    keywordsJson: parseJsonArray<string[]>(String(row.keywords_json ?? "[]"), []),
    extractedDataJson: normalizeExtractedData(extractedData),
    analyzedPageCount: Number(row.analyzed_page_count),
    confidenceLevel: normalizeConfidenceLevel(row.confidence_level),
    confidenceScore: Number(row.confidence_score ?? 0),
    status: String(row.status) as WebsiteAnalysisRun["status"],
    createdAt: String(row.created_at)
  };
}

export function mapSeoAuditRun(row: Row): SeoAuditRun {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    score: Number(row.score),
    findingsJson: parseJsonArray<SeoAuditRun["findingsJson"]>(String(row.findings_json ?? "[]"), []),
    createdAt: String(row.created_at)
  };
}

export function mapOpportunity(row: Row): ContentOpportunity {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    keyword: String(row.keyword),
    topic: String(row.topic ?? row.keyword),
    cluster: String(row.cluster),
    intent: normalizeIntent(row.intent),
    relevanceScore: Number(row.relevance_score),
    estimatedDifficulty: normalizeDifficulty(row.estimated_difficulty),
    priority: normalizePriority(row.priority),
    source: String(row.source),
    status: String(row.status) as ContentOpportunity["status"],
    createdAt: String(row.created_at)
  };
}

export function mapArticlePlan(row: Row): ArticlePlan {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
    title: String(row.title),
    targetKeyword: String(row.target_keyword),
    secondaryKeywordsJson: parseJsonArray<string[]>(String(row.secondary_keywords_json ?? "[]"), []),
    searchIntent: normalizeIntent(row.search_intent ?? row.intent),
    angle: String(row.angle),
    cta: String(row.cta),
    brief: String(row.brief),
    status: String(row.status) as ArticlePlan["status"],
    createdAt: String(row.created_at)
  };
}

export function mapDraft(row: Row): Draft {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    articlePlanId: String(row.article_plan_id),
    outlineJson: parseJsonArray<string[]>(String(row.outline_json ?? "[]"), []),
    articleMarkdown: String(row.article_markdown),
    articleHtml: String(row.article_html),
    slug: String(row.slug),
    metaTitle: String(row.meta_title),
    metaDescription: String(row.meta_description),
    faqJson: parseJsonArray<Draft["faqJson"]>(String(row.faq_json ?? "[]"), []),
    internalLinksJson: parseJsonArray<Draft["internalLinksJson"]>(String(row.internal_links_json ?? "[]"), []),
    readinessScore: Number(row.readiness_score),
    status: String(row.status) as Draft["status"],
    createdAt: String(row.created_at)
  };
}

export function mapAutomationRun(row: Row): AutomationRun {
  const rawSummary = String(row.output_summary ?? "");
  const parsedSummary = parseJsonArray<unknown>(rawSummary, rawSummary);

  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    runType: String(row.run_type) as AutomationRun["runType"],
    status: String(row.status) as AutomationRun["status"],
    logsJson: parseJsonArray<string[]>(String(row.logs_json ?? "[]"), []),
    outputSummary: normalizeAutomationSummary(parsedSummary),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at)
  };
}

export function mapExportJob(row: Row): ExportJob {
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    draftId: String(row.draft_id),
    exportPath: String(row.export_path),
    status: String(row.status) as ExportJob["status"],
    createdAt: String(row.created_at)
  };
}

export function mapAuthSnapshot(value: unknown): AuthSnapshot {
  if (!value || typeof value !== "object") {
    return defaultAuthSnapshot;
  }

  const record = value as Record<string, unknown>;
  return {
    isAuthenticated: Boolean(record.isAuthenticated),
    hasActiveSubscription: Boolean(record.hasActiveSubscription),
    user: record.user && typeof record.user === "object" ? mapAuthUser(record.user as Row) : null,
    subscription:
      record.subscription && typeof record.subscription === "object"
        ? mapSubscription(record.subscription as Row)
        : null
  };
}
