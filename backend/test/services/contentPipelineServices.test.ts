import { describe, expect, it } from "vitest";
import { generateOpportunityCandidates } from "../../src/content/opportunityGenerationCore";
import { analysisRepository } from "../../src/repositories/analysisRepository";
import { articlePlanRepository, draftRepository, opportunityRepository } from "../../src/repositories/contentRepository";
import { websiteRepository } from "../../src/repositories/websiteRepository";
import { ArticlePlanService } from "../../src/services/articlePlanService";
import { DraftService } from "../../src/services/draftService";
import { OpportunityGeneratorService } from "../../src/services/opportunityGeneratorService";
import { Website, WebsiteAnalysisRun } from "../../src/types";

describe("Content pipeline services", () => {
  it("generates analysis-based opportunities without persisting duplicate keywords", () => {
    const generator = new OpportunityGeneratorService();

    const firstRun = generator.generateForWebsite("site-greenforge", 6);
    const secondRun = generator.generateForWebsite("site-greenforge", 6);

    const allKeywords = opportunityRepository.list("site-greenforge").map((opportunity) => opportunity.keyword.toLowerCase());
    const uniqueKeywordCount = new Set(allKeywords).size;

    expect(firstRun.createdOpportunities.length).toBeGreaterThan(0);
    expect(secondRun.skippedDuplicatesCount).toBeGreaterThan(0);
    expect(uniqueKeywordCount).toBe(allKeywords.length);
    expect(firstRun.createdOpportunities.every((opportunity) => opportunity.source === "analysis")).toBe(true);
  });

  it("generates phrase-based opportunities that read like real searches", () => {
    const website = websiteRepository.getById("site-finnova");
    const analysis = analysisRepository.getLatestByWebsiteId("site-finnova");

    if (!website || !analysis) {
      throw new Error("Expected seeded website analysis for site-finnova.");
    }

    const opportunities = generateOpportunityCandidates(website, analysis, [], 8).opportunities;

    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.every((opportunity) => opportunity.keyword.split(/\s+/).length >= 3)).toBe(true);
    expect(opportunities.every((opportunity) => !/operations consulting|business systems|global market focus/i.test(opportunity.keyword))).toBe(true);
    expect(
      opportunities.every(
        (opportunity) =>
          /^(what is|what are|how to|best |examples of|common mistakes in|why )/i.test(opportunity.keyword) ||
          /\b vs \b/i.test(opportunity.keyword) ||
          /\bin united states\b/i.test(opportunity.keyword)
      )
    ).toBe(true);
    expect(
      opportunities.some((opportunity) => ["Process Automation", "Workflow Automation", "Bookkeeping Operations"].includes(opportunity.cluster))
    ).toBe(true);
    expect(opportunities.every((opportunity) => !/small business|homeowners/i.test(opportunity.keyword))).toBe(true);
  });

  it("enriches weak medium-confidence bookkeeping phrases into more specific queries", () => {
    const website: Website = {
      id: "site-test-bookkeeping",
      name: "Northstar Bookkeeping",
      domain: "https://northstar-bookkeeping.example",
      language: "English",
      targetCountry: "United Kingdom",
      niche: "Bookkeeping services",
      tone: "Helpful, clear, trustworthy",
      contentGoal: "Generate more qualified local leads",
      publishingFrequency: "Weekly",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const analysis: WebsiteAnalysisRun = {
      id: "analysis-test-bookkeeping",
      websiteId: website.id,
      nicheSummary: "Northstar focuses on bookkeeping support for local businesses with limited educational depth.",
      contentPillarsJson: ["reporting setup", "cash flow visibility", "monthly bookkeeping"],
      keywordsJson: ["reporting setup", "cash flow visibility", "monthly bookkeeping"],
      extractedDataJson: {
        url: website.domain,
        title: "Bookkeeping for local businesses",
        metaDescription: "Bookkeeping help for local service businesses.",
        h1: "Bookkeeping support for local businesses",
        h2Headings: ["Monthly bookkeeping", "Cash flow visibility", "Reporting setup"],
        mainTextContent: "A short site with limited educational depth and mostly service-led copy.",
        pageSignals: [
          {
            url: website.domain,
            title: "Bookkeeping for local businesses",
            h1: "Bookkeeping support for local businesses",
            pageType: "homepage",
            h2Headings: ["Monthly bookkeeping", "Cash flow visibility", "Reporting setup"],
            contentExtract: "Short service-led homepage copy with limited topical coverage."
          }
        ]
      },
      analyzedPageCount: 2,
      confidenceLevel: "medium",
      confidenceScore: 54,
      status: "analyzed",
      createdAt: new Date().toISOString()
    };

    const opportunities = generateOpportunityCandidates(website, analysis, [], 6).opportunities;
    const keywords = opportunities.map((opportunity) => opportunity.keyword);

    expect(keywords.some((keyword) => /financial reporting for small businesses|cash flow planning for small businesses/i.test(keyword))).toBe(
      true
    );
    expect(keywords.every((keyword) => !/\breporting setup\b|\bcash flow visibility\b/i.test(keyword))).toBe(true);
    expect(keywords.every((keyword) => /small businesses|how to|common mistakes|examples of|what is|what are|best /i.test(keyword))).toBe(
      true
    );
  });

  it("creates varied editorial titles for simple-site opportunities", () => {
    const website: Website = {
      id: "site-editorial-simple",
      name: "Northstar Bookkeeping",
      domain: "https://northstar-bookkeeping.example",
      language: "English",
      targetCountry: "United Kingdom",
      niche: "Bookkeeping services",
      tone: "Helpful, clear, trustworthy",
      contentGoal: "Generate more qualified local leads",
      publishingFrequency: "Weekly",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const analysis: WebsiteAnalysisRun = {
      id: "analysis-editorial-simple",
      websiteId: website.id,
      nicheSummary: "Northstar focuses on bookkeeping support for local businesses with limited educational depth.",
      contentPillarsJson: ["reporting setup", "cash flow visibility", "monthly bookkeeping"],
      keywordsJson: ["reporting setup", "cash flow visibility", "monthly bookkeeping"],
      extractedDataJson: {
        url: website.domain,
        title: "Bookkeeping for local businesses",
        metaDescription: "Bookkeeping help for local service businesses.",
        h1: "Bookkeeping support for local businesses",
        h2Headings: ["Monthly bookkeeping", "Cash flow visibility", "Reporting setup"],
        mainTextContent: "A short site with limited educational depth and mostly service-led copy.",
        pageSignals: [
          {
            url: website.domain,
            title: "Bookkeeping for local businesses",
            h1: "Bookkeeping support for local businesses",
            pageType: "homepage",
            h2Headings: ["Monthly bookkeeping", "Cash flow visibility", "Reporting setup"],
            contentExtract: "Short service-led homepage copy with limited topical coverage."
          }
        ]
      },
      analyzedPageCount: 2,
      confidenceLevel: "medium",
      confidenceScore: 54,
      status: "analyzed",
      createdAt: new Date().toISOString()
    };

    const topics = generateOpportunityCandidates(website, analysis, [], 10).opportunities.map((opportunity) => opportunity.topic);

    expect(topics.length).toBe(10);
    expect(topics.every((topic) => topic.length > 24)).toBe(true);
    expect(topics.some((topic) => /^How .* Works\b/.test(topic))).toBe(true);
    expect(topics.some((topic) => /^When to Use\b/.test(topic) || /\bExplained for\b/.test(topic))).toBe(true);
    expect(topics.some((topic) => /^Signs You Need\b/.test(topic) || /\bMistakes That Cost\b/.test(topic))).toBe(true);
    expect(topics.some((topic) => /\bwithout\b/.test(topic) || /\bvs\b/.test(topic))).toBe(true);
  });

  it("blocks opportunity generation when the latest analysis confidence is low", () => {
    const generator = new OpportunityGeneratorService();
    const latestAnalysis = analysisRepository.getLatestByWebsiteId("site-greenforge");

    if (!latestAnalysis) {
      throw new Error("Expected seeded analysis for site-greenforge.");
    }

    analysisRepository.create({
      ...latestAnalysis,
      id: `${latestAnalysis.id}-low-confidence`,
      confidenceLevel: "low",
      confidenceScore: 18,
      createdAt: new Date(Date.now() + 1_000).toISOString()
    });

    expect(() => generator.generateForWebsite("site-greenforge", 4)).toThrow(/low confidence/i);
  });

  it("creates a plan once per opportunity unless explicitly regenerated", () => {
    const service = new ArticlePlanService();

    const firstRun = service.generateFromOpportunity("opp-finnova-2");
    const secondRun = service.generateFromOpportunity("opp-finnova-2");
    const persistedPlan = articlePlanRepository.findByOpportunityId("opp-finnova-2");

    expect(firstRun.skipped).toBe(false);
    expect(firstRun.plan.status).toBe("planned");
    expect(firstRun.plan.secondaryKeywordsJson.length).toBeGreaterThanOrEqual(3);
    expect(firstRun.plan.secondaryKeywordsJson.length).toBeLessThanOrEqual(6);
    expect(firstRun.plan.cta.length).toBeGreaterThan(0);
    expect(secondRun.skipped).toBe(true);
    expect(secondRun.plan.id).toBe(firstRun.plan.id);
    expect(persistedPlan?.id).toBe(firstRun.plan.id);
  });

  it("generates structured drafts once per plan unless explicitly regenerated", () => {
    const service = new DraftService();

    const firstRun = service.generateFromArticlePlan("plan-greenforge-1");
    const secondRun = service.generateFromArticlePlan("plan-greenforge-1");
    const persistedDraft = draftRepository.findByArticlePlanId("plan-greenforge-1");

    expect(firstRun.skipped).toBe(false);
    expect(firstRun.draft.slug.length).toBeGreaterThan(0);
    expect(firstRun.draft.articleMarkdown).toContain("#");
    expect(firstRun.draft.articleHtml).toContain("<h1>");
    expect(firstRun.draft.faqJson.length).toBeGreaterThanOrEqual(3);
    expect(firstRun.draft.internalLinksJson.length).toBeGreaterThan(0);
    expect(firstRun.draft.readinessScore).toBeGreaterThan(60);
    expect(secondRun.skipped).toBe(true);
    expect(persistedDraft?.id).toBe(firstRun.draft.id);
  });
});
