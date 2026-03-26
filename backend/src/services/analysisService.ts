import { ContentPillarTool } from "../agent/tools/contentPillarTool";
import { NicheInferenceTool } from "../agent/tools/nicheInferenceTool";
import { WebsiteCrawler } from "../crawlers/websiteCrawler";
import { analysisRepository } from "../repositories/analysisRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";

export class AnalysisService {
  private readonly crawler = new WebsiteCrawler();

  private readonly nicheTool = new NicheInferenceTool();

  private readonly pillarTool = new ContentPillarTool();

  async analyzeWebsite(websiteId: string): Promise<{ analysis: WebsiteAnalysisRun; pages: WebsitePage[] }> {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const crawlResults = await this.crawler.crawlWebsite(website);
    const inferred = this.nicheTool.infer(website, crawlResults);
    const contentPillars = this.pillarTool.infer(website, crawlResults);
    const pages: WebsitePage[] = crawlResults.map((page) => ({
      id: createId("page"),
      websiteId,
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      h1: page.h1,
      headingsJson: page.headings,
      contentExtract: page.contentExtract,
      pageType: page.pageType,
      createdAt: new Date().toISOString()
    }));

    websitePageRepository.replaceForWebsite(websiteId, pages);

    websiteRepository.update({
      ...website,
      niche: inferred.niche || website.niche,
      updatedAt: new Date().toISOString()
    });

    const analysis: WebsiteAnalysisRun = {
      id: createId("analysis"),
      websiteId,
      nicheSummary: inferred.summary,
      contentPillarsJson: contentPillars,
      analyzedPageCount: pages.length,
      status: "analyzed",
      createdAt: new Date().toISOString()
    };

    analysisRepository.create(analysis);
    return { analysis, pages };
  }

  getAnalysisHistory(websiteId: string): WebsiteAnalysisRun[] {
    return analysisRepository.listByWebsiteId(websiteId);
  }
}
