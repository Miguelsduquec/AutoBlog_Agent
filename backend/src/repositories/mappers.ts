import {
  ArticlePlan,
  AutomationRun,
  ContentOpportunity,
  Draft,
  ExportJob,
  SeoAuditRun,
  Website,
  WebsiteAnalysisRun,
  WebsitePage
} from "../types";
import { parseJsonArray } from "../utils/json";

type Row = Record<string, unknown>;

export function mapWebsite(row: Row): Website {
  return {
    id: String(row.id),
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
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    nicheSummary: String(row.niche_summary),
    contentPillarsJson: parseJsonArray<string[]>(String(row.content_pillars_json ?? "[]"), []),
    analyzedPageCount: Number(row.analyzed_page_count),
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
    cluster: String(row.cluster),
    intent: String(row.intent),
    relevanceScore: Number(row.relevance_score),
    estimatedDifficulty: Number(row.estimated_difficulty),
    priority: String(row.priority),
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
    angle: String(row.angle),
    intent: String(row.intent),
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
  return {
    id: String(row.id),
    websiteId: String(row.website_id),
    runType: String(row.run_type),
    status: String(row.status) as AutomationRun["status"],
    logsJson: parseJsonArray<string[]>(String(row.logs_json ?? "[]"), []),
    outputSummary: String(row.output_summary),
    createdAt: String(row.created_at)
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
