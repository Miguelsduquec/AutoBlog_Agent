import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { WebsiteCrawler } from "../../src/crawlers/websiteCrawler";
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "../../src/db/seedData";
import { authHeaders, loginUser } from "../helpers/auth";
import { invokeApp } from "../helpers/invokeApp";

const app = createApp({ seed: false });

async function loginDemoUser() {
  const { sessionToken } = await loginUser(app, DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
  return sessionToken;
}

describe("Content workflow API", () => {
  it("analyzes a website and returns extracted signals", async () => {
    const sessionToken = await loginDemoUser();

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
      }
    ]);

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/websites/site-polped/analyze",
      headers: authHeaders(sessionToken)
    });

    expect(response.status).toBe(200);
    expect((response.body as any).analysis.websiteId).toBe("site-polped");
    expect((response.body as any).analysis.extractedDataJson.title).toContain("Microsoft Consulting");
    expect((response.body as any).analysis.confidenceLevel).toMatch(/medium|high/);
    expect((response.body as any).pages).toHaveLength(2);
  });

  it("creates opportunities, plans, drafts, and exports through the authenticated API", async () => {
    const sessionToken = await loginDemoUser();

    const opportunitiesResponse = await invokeApp(app, {
      method: "POST",
      url: "/api/websites/site-greenforge/generate-opportunities",
      body: { limit: 6 },
      headers: authHeaders(sessionToken)
    });

    expect(opportunitiesResponse.status).toBe(200);
    expect((opportunitiesResponse.body as any).createdOpportunities.length).toBeGreaterThan(0);

    const opportunityId = (opportunitiesResponse.body as any).createdOpportunities[0].id as string;

    const planResponse = await invokeApp(app, {
      method: "POST",
      url: `/api/opportunities/${opportunityId}/generate-plan`,
      body: {},
      headers: authHeaders(sessionToken)
    });
    const planId = (planResponse.body as any).plan.id as string;

    expect(planResponse.status).toBe(201);
    expect((planResponse.body as any).plan.status).toBe("planned");
    expect((planResponse.body as any).plan.secondaryKeywordsJson.length).toBeGreaterThanOrEqual(3);

    const draftResponse = await invokeApp(app, {
      method: "POST",
      url: `/api/article-plans/${planId}/generate-draft`,
      body: {},
      headers: authHeaders(sessionToken)
    });
    const draftId = (draftResponse.body as any).draft.id as string;

    expect(draftResponse.status).toBe(201);
    expect((draftResponse.body as any).draft.status).toMatch(/review|drafting/);
    expect((draftResponse.body as any).draft.readinessScore).toBeGreaterThan(60);

    const exportResponse = await invokeApp(app, {
      method: "POST",
      url: `/api/drafts/${draftId}/export`,
      body: {},
      headers: authHeaders(sessionToken)
    });

    expect(exportResponse.status).toBe(201);
    expect((exportResponse.body as any).exportJob.draftId).toBe(draftId);
    expect((exportResponse.body as any).files).toEqual([
      "article.md",
      "content.html",
      "metadata.json",
      "seo.json",
      "brief.json"
    ]);
  });

  it("returns a public content gap grader report for an ad hoc website URL", async () => {
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

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/tools/content-gap-grader",
      body: { url: "polped.com" }
    });

    expect(response.status).toBe(200);
    expect((response.body as any).websiteName).toBe("Polped");
    expect((response.body as any).scores.topicGapCount).toBeGreaterThan(0);
    expect((response.body as any).analysisConfidenceLevel).toMatch(/medium|high/);
    expect((response.body as any).topMissingOpportunities).toHaveLength(5);
  });

  it("returns a user-friendly 400 for invalid website input", async () => {
    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/tools/content-gap-grader",
      body: { url: "::::" }
    });

    expect(response.status).toBe(400);
    expect((response.body as any).message).toMatch(/valid website url/i);
  });

  it("validates website URLs when creating tracked websites", async () => {
    const sessionToken = await loginDemoUser();

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/websites",
      body: {
        name: "Broken URL Co",
        domain: "notaurl",
        language: "English",
        targetCountry: "Global",
        niche: "Consulting",
        tone: "Neutral",
        contentGoal: "Generate leads",
        publishingFrequency: "Weekly"
      },
      headers: authHeaders(sessionToken)
    });

    expect(response.status).toBe(400);
    expect((response.body as any).message).toMatch(/valid website url/i);
  });
});
