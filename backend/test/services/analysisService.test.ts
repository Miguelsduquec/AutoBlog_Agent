import { describe, expect, it, vi } from "vitest";
import { WebsiteCrawler } from "../../src/crawlers/websiteCrawler";
import { analysisRepository } from "../../src/repositories/analysisRepository";
import { websitePageRepository } from "../../src/repositories/websiteRepository";
import { AnalysisService } from "../../src/services/analysisService";

describe("AnalysisService", () => {
  it("extracts website data and persists analysis results", async () => {
    vi.spyOn(WebsiteCrawler.prototype, "crawlWebsite").mockResolvedValue([
      {
        url: "https://polped.com",
        title: "Polped | Microsoft Consulting for Business Productivity",
        metaDescription: "Helping SMBs implement Microsoft 365 and secure productivity workflows.",
        h1: "Microsoft consulting that helps teams work better",
        headings: ["Microsoft 365 consulting", "Teams governance"],
        h2Headings: ["Microsoft 365 consulting", "Teams governance"],
        contentExtract: "Polped helps businesses adopt Microsoft 365, improve collaboration, and strengthen security.",
        pageType: "homepage"
      },
      {
        url: "https://polped.com/services",
        title: "Services | Polped",
        metaDescription: "Microsoft delivery and automation support.",
        h1: "Microsoft consulting services",
        headings: ["Automation delivery", "Governance support"],
        h2Headings: ["Automation delivery", "Governance support"],
        contentExtract: "Services cover Microsoft 365 delivery, automation planning, and governance support.",
        pageType: "service"
      },
      {
        url: "https://polped.com/blog",
        title: "Polped Blog",
        metaDescription: "Practical guidance for Microsoft teams.",
        h1: "Guidance for Microsoft teams",
        headings: ["Automation advice", "Governance updates"],
        h2Headings: ["Automation advice", "Governance updates"],
        contentExtract: "Recent blog coverage helps teams improve collaboration and workflow automation with practical guidance.",
        pageType: "blog-support"
      }
    ]);

    const service = new AnalysisService();
    const result = await service.analyzeWebsite("site-polped");

    expect(result.analysis.extractedDataJson.title).toContain("Microsoft Consulting");
    expect(result.analysis.keywordsJson.length).toBeGreaterThan(0);
    expect(result.analysis.status).toBe("analyzed");
    expect(result.pages).toHaveLength(3);
    expect(result.analysis.confidenceLevel).toMatch(/medium|high/);
    expect(result.analysis.confidenceScore).toBeGreaterThanOrEqual(40);
    expect(result.analysis.extractedDataJson.pageSignals).toHaveLength(3);

    const persistedAnalysis = analysisRepository.getLatestByWebsiteId("site-polped");
    const persistedPage = websitePageRepository.listByWebsiteId("site-polped")[0];

    expect(persistedAnalysis?.id).toBe(result.analysis.id);
    expect(persistedPage?.title).toBe(result.pages[0].title);
  });

  it("falls back to generated content when crawling fails", async () => {
    vi.spyOn(WebsiteCrawler.prototype, "crawlWebsite").mockResolvedValue([
      {
        url: "https://finnovaops.com",
        title: "Finnova Ops",
        metaDescription: "",
        h1: "Operations support",
        headings: [],
        h2Headings: [],
        contentExtract: "Short copy only, but enough text to trigger a low-confidence summary rather than a hard failure.",
        pageType: "homepage"
      }
    ]);

    const service = new AnalysisService();
    const result = await service.analyzeWebsite("site-finnova");

    expect(result.analysis.extractedDataJson.title).toContain("Finnova Ops");
    expect(result.analysis.extractedDataJson.mainTextContent.length).toBeGreaterThan(20);
    expect(result.analysis.keywordsJson.length).toBeGreaterThan(0);
    expect(result.analysis.confidenceLevel).toMatch(/low|medium/);
  });
});
