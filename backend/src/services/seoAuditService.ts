import { seoAuditRepository } from "../repositories/analysisRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { buildSeoAudit } from "../seo/seoAuditEngine";
import { SeoAuditRun } from "../types";
import { createId } from "../utils/ids";
import { AnalysisService } from "./analysisService";

export class SeoAuditService {
  private readonly analysisService = new AnalysisService();

  async runAudit(websiteId: string): Promise<SeoAuditRun> {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    let pages = websitePageRepository.listByWebsiteId(websiteId);
    if (pages.length === 0) {
      const analysis = await this.analysisService.analyzeWebsite(websiteId);
      pages = analysis.pages;
    }

    const result = buildSeoAudit(
      pages.map((page) => ({
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        h1: page.h1,
        headings: page.headingsJson,
        h2Headings: page.headingsJson,
        contentExtract: page.contentExtract,
        pageType: page.pageType
      }))
    );

    const audit: SeoAuditRun = {
      id: createId("audit"),
      websiteId,
      score: result.score,
      findingsJson: result.findings,
      createdAt: new Date().toISOString()
    };

    seoAuditRepository.create(audit);
    return audit;
  }

  listAudits(websiteId: string): SeoAuditRun[] {
    return seoAuditRepository.listByWebsiteId(websiteId);
  }
}
