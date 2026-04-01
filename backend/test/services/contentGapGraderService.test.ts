import { describe, expect, it, vi } from "vitest";
import { WebsiteCrawler } from "../../src/crawlers/websiteCrawler";
import { ContentGapGraderService } from "../../src/services/contentGapGraderService";

describe("ContentGapGraderService", () => {
  it("builds a shareable report from crawled website signals", async () => {
    vi.spyOn(WebsiteCrawler.prototype, "crawlWebsite").mockResolvedValue([
      {
        url: "https://polped.com",
        title: "Polped | Microsoft Consulting for Business Productivity",
        metaDescription: "Helping SMBs implement Microsoft 365 and secure productivity workflows.",
        h1: "Microsoft consulting that helps teams work better",
        headings: ["Microsoft 365 consulting", "Teams governance", "Automation strategy"],
        h2Headings: ["Microsoft 365 consulting", "Teams governance", "Automation strategy"],
        contentExtract:
          "Polped helps businesses adopt Microsoft 365, improve collaboration, and build automation workflows for teams.",
        pageType: "homepage"
      },
      {
        url: "https://polped.com/services",
        title: "Microsoft 365 Services | Polped",
        metaDescription: "Consulting services for Microsoft 365 and Power Platform delivery.",
        h1: "Microsoft 365 services",
        headings: ["Consulting services", "Power Platform delivery"],
        h2Headings: ["Consulting services", "Power Platform delivery"],
        contentExtract:
          "Service delivery for Microsoft 365, SharePoint, and workflow automation with consulting support.",
        pageType: "service"
      },
      {
        url: "https://polped.com/blog",
        title: "Polped Blog",
        metaDescription: "Insights and updates on Microsoft productivity and collaboration.",
        h1: "Insights for Microsoft teams",
        headings: ["Latest insights", "Governance updates"],
        h2Headings: ["Latest insights", "Governance updates"],
        contentExtract: "Latest insights, updated guidance, and practical content for teams in 2026.",
        pageType: "blog-support"
      }
    ]);

    const service = new ContentGapGraderService();
    const report = await service.gradeWebsite("polped.com");

    expect(report.websiteName).toBe("Polped");
    expect(report.scores.overallScore).toBeGreaterThan(0);
    expect(report.topMissingOpportunities).toHaveLength(5);
    expect(report.quickWinIdeas).toHaveLength(3);
    expect(report.analysisConfidenceLevel).toMatch(/medium|high/);
    expect(report.analysisConfidenceScore).toBeGreaterThan(50);
    expect(report.shareMessage).toContain("Polped scored");
    expect(report.topMissingOpportunities.every((idea) => !/operations consulting|business systems|global market focus/i.test(idea.keyword))).toBe(
      true
    );
    expect(
      report.quickWinIdeas.every(
        (idea) => /^(What|How|Best|Examples|Common|Why|When|Signs|O Que|Como)/.test(idea.topic) || /Explained for|Mistakes That Cost/.test(idea.topic)
      )
    ).toBe(true);
  });
});
