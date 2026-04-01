import { WebsiteCrawler } from "../crawlers/websiteCrawler";
import {
  computeAnalysisConfidence,
  extractKeywordsFromSignals,
  generateMockNicheSummary,
  mergeExtractedDataFromPages
} from "../content/analysisInsights";
import { analysisRepository } from "../repositories/analysisRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { ExtractedWebsiteData, Website, WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";

export class AnalysisService {
  private readonly crawler = new WebsiteCrawler();

  async analyzeWebsite(websiteId: string): Promise<{ analysis: WebsiteAnalysisRun; pages: WebsitePage[] }> {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const crawledPages = await this.crawler.crawlWebsite(website);
    const extractedData: ExtractedWebsiteData = mergeExtractedDataFromPages(crawledPages, website.name);
    const keywords = extractKeywordsFromSignals(extractedData.title, extractedData.h1, extractedData.h2Headings, website.language);
    const confidence = computeAnalysisConfidence(crawledPages, extractedData);

    const pages: WebsitePage[] = crawledPages.map((page) => ({
      id: createId("page"),
      websiteId,
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      h1: page.h1,
      headingsJson: page.h2Headings,
      contentExtract: page.contentExtract,
      pageType: page.pageType,
      createdAt: new Date().toISOString()
    }));

    websitePageRepository.replaceForWebsite(websiteId, pages);

    websiteRepository.update({
      ...website,
      updatedAt: new Date().toISOString()
    });

    const analysis: WebsiteAnalysisRun = {
      id: createId("analysis"),
      websiteId,
      nicheSummary: generateMockNicheSummary(website, extractedData, keywords),
      contentPillarsJson: keywords,
      keywordsJson: keywords,
      extractedDataJson: extractedData,
      analyzedPageCount: pages.length,
      confidenceLevel: confidence.confidenceLevel,
      confidenceScore: confidence.confidenceScore,
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
