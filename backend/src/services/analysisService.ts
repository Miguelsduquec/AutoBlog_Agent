import { WebsiteCrawler } from "../crawlers/websiteCrawler";
import { analysisRepository } from "../repositories/analysisRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { ExtractedWebsiteData, Website, WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "this",
  "your",
  "about",
  "into",
  "what",
  "when",
  "where",
  "have",
  "will",
  "best",
  "guide"
]);

export class AnalysisService {
  private readonly crawler = new WebsiteCrawler();

  private extractKeywords(title: string, h1: string, h2Headings: string[]): string[] {
    const counts = new Map<string, number>();
    const segments = [title, h1, ...h2Headings];

    for (const segment of segments) {
      for (const token of segment.toLowerCase().split(/[^a-z0-9]+/)) {
        if (!token || token.length < 4 || STOP_WORDS.has(token)) {
          continue;
        }

        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([token]) => token);
  }

  private generateMockNicheSummary(website: Website, extractedData: ExtractedWebsiteData, keywords: string[]): string {
    const dominantKeyword = keywords[0] ?? website.niche.toLowerCase();
    const h2Summary = extractedData.h2Headings.slice(0, 2).join(", ").toLowerCase();

    return `${website.name} appears to be focused on ${dominantKeyword} and related topics for ${website.targetCountry}. The homepage messaging emphasizes ${extractedData.h1.toLowerCase()}, while the supporting sections cover ${h2Summary || website.niche.toLowerCase()}.`;
  }

  async analyzeWebsite(websiteId: string): Promise<{ analysis: WebsiteAnalysisRun; pages: WebsitePage[] }> {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const extractedPage = (await this.crawler.analyzeUrl(website.domain)) ?? this.crawler.buildFallbackForWebsite(website);
    const extractedData: ExtractedWebsiteData = {
      url: extractedPage.url,
      title: extractedPage.title,
      metaDescription: extractedPage.metaDescription,
      h1: extractedPage.h1,
      h2Headings: extractedPage.h2Headings,
      mainTextContent: extractedPage.contentExtract
    };
    const keywords = this.extractKeywords(extractedData.title, extractedData.h1, extractedData.h2Headings);

    const pages: WebsitePage[] = [
      {
      id: createId("page"),
      websiteId,
      url: extractedPage.url,
      title: extractedPage.title,
      metaDescription: extractedPage.metaDescription,
      h1: extractedPage.h1,
      headingsJson: extractedPage.h2Headings,
      contentExtract: extractedPage.contentExtract,
      pageType: extractedPage.pageType,
      createdAt: new Date().toISOString()
    }
    ];

    websitePageRepository.replaceForWebsite(websiteId, pages);

    websiteRepository.update({
      ...website,
      updatedAt: new Date().toISOString()
    });

    const analysis: WebsiteAnalysisRun = {
      id: createId("analysis"),
      websiteId,
      nicheSummary: this.generateMockNicheSummary(website, extractedData, keywords),
      contentPillarsJson: keywords,
      keywordsJson: keywords,
      extractedDataJson: extractedData,
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
