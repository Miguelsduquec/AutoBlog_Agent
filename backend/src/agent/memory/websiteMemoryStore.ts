import { SeoAuditRun, Website, WebsiteAnalysisRun, WebsitePage } from "../../types";

export class WebsiteMemoryStore {
  buildSnapshot(website: Website, analysis: WebsiteAnalysisRun | null, audit: SeoAuditRun | null, pages: WebsitePage[]) {
    return {
      website,
      latestAnalysis: analysis,
      latestAudit: audit,
      pageUrls: pages.map((page) => page.url),
      contentPillars: analysis?.contentPillarsJson ?? []
    };
  }
}
