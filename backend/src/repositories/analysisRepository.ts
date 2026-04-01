import { db } from "../db/database";
import { SeoAuditRun, WebsiteAnalysisRun } from "../types";
import { mapAnalysisRun, mapSeoAuditRun } from "./mappers";

export const analysisRepository = {
  listRecent(limit = 5): WebsiteAnalysisRun[] {
    const rows = db
      .prepare("SELECT * FROM website_analysis_runs ORDER BY datetime(created_at) DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(mapAnalysisRun);
  },

  listByWebsiteId(websiteId: string): WebsiteAnalysisRun[] {
    const rows = db
      .prepare("SELECT * FROM website_analysis_runs WHERE website_id = ? ORDER BY datetime(created_at) DESC")
      .all(websiteId) as Record<string, unknown>[];
    return rows.map(mapAnalysisRun);
  },

  getLatestByWebsiteId(websiteId: string): WebsiteAnalysisRun | null {
    const row = db
      .prepare("SELECT * FROM website_analysis_runs WHERE website_id = ? ORDER BY datetime(created_at) DESC LIMIT 1")
      .get(websiteId) as Record<string, unknown> | undefined;
    return row ? mapAnalysisRun(row) : null;
  },

  create(run: WebsiteAnalysisRun): WebsiteAnalysisRun {
    db.prepare(`
      INSERT INTO website_analysis_runs (
        id, website_id, niche_summary, content_pillars_json, keywords_json, extracted_data_json, analyzed_page_count, confidence_level, confidence_score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      run.websiteId,
      run.nicheSummary,
      JSON.stringify(run.contentPillarsJson),
      JSON.stringify(run.keywordsJson),
      JSON.stringify(run.extractedDataJson),
      run.analyzedPageCount,
      run.confidenceLevel,
      run.confidenceScore,
      run.status,
      run.createdAt
    );

    return run;
  },

  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM website_analysis_runs").get() as { count: number };
    return row.count;
  }
};

export const seoAuditRepository = {
  listByWebsiteId(websiteId: string): SeoAuditRun[] {
    const rows = db
      .prepare("SELECT * FROM seo_audit_runs WHERE website_id = ? ORDER BY datetime(created_at) DESC")
      .all(websiteId) as Record<string, unknown>[];
    return rows.map(mapSeoAuditRun);
  },

  getLatestByWebsiteId(websiteId: string): SeoAuditRun | null {
    const row = db
      .prepare("SELECT * FROM seo_audit_runs WHERE website_id = ? ORDER BY datetime(created_at) DESC LIMIT 1")
      .get(websiteId) as Record<string, unknown> | undefined;
    return row ? mapSeoAuditRun(row) : null;
  },

  create(audit: SeoAuditRun): SeoAuditRun {
    db.prepare(`
      INSERT INTO seo_audit_runs (
        id, website_id, score, findings_json, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(audit.id, audit.websiteId, audit.score, JSON.stringify(audit.findingsJson), audit.createdAt);

    return audit;
  }
};
