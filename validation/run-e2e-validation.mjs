import fs from "node:fs";
import path from "node:path";

const API_BASE = process.env.API_BASE ?? "http://127.0.0.1:3012/api";
const outputDir = process.env.VALIDATION_OUTPUT_DIR ?? "/tmp/autoblog-validation";

async function request(method, route, body) {
  const response = await fetch(`${API_BASE}${route}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let payload = text;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: payload
    };
  }

  return {
    ok: true,
    status: response.status,
    body: payload
  };
}

function wordCount(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function summarizeOpportunity(opportunity) {
  return {
    keyword: opportunity.keyword,
    topic: opportunity.topic,
    intent: opportunity.intent,
    priority: opportunity.priority,
    score: opportunity.relevanceScore,
    difficulty: opportunity.estimatedDifficulty
  };
}

function summarizePlan(plan) {
  return {
    id: plan.id,
    title: plan.title,
    targetKeyword: plan.targetKeyword,
    intent: plan.searchIntent,
    cta: plan.cta,
    angle: plan.angle,
    brief: plan.brief
  };
}

function summarizeDraft(draft, relatedPlan) {
  return {
    id: draft.id,
    title: relatedPlan?.title ?? null,
    slug: draft.slug,
    status: draft.status,
    readinessScore: draft.readinessScore,
    wordCount: wordCount(draft.articleMarkdown),
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    faqCount: draft.faqJson.length,
    internalLinkCount: draft.internalLinksJson.length,
    excerpt: draft.articleMarkdown.slice(0, 420)
  };
}

async function createWebsite(input) {
  const created = await request("POST", "/websites", input);
  if (!created.ok) {
    return {
      ok: false,
      status: created.status,
      body: created.body
    };
  }

  return {
    ok: true,
    body: created.body
  };
}

async function runCase(caseName, siteConfig) {
  const createdWebsite = await createWebsite(siteConfig.websiteInput);
  if (!createdWebsite.ok) {
    return {
      caseName,
      website: null,
      failedAt: "create-website",
      error: createdWebsite.body,
      steps: {
        analysis: { ok: false, status: createdWebsite.status, message: "Website creation failed." },
        opportunities: { ok: false, status: createdWebsite.status, message: "Website creation failed." },
        plans: { ok: false, status: createdWebsite.status, count: 0, items: [] },
        drafts: { ok: false, status: createdWebsite.status, count: 0, items: [] },
        exports: []
      }
    };
  }

  const website = createdWebsite.body;
  const analysis = await request("POST", `/websites/${website.id}/analyze`);
  const opportunities = await request("POST", `/websites/${website.id}/generate-opportunities`, { limit: 10 });
  const plans = await request("POST", `/websites/${website.id}/plans/generate`, { limit: 5 });
  const drafts = await request("POST", `/websites/${website.id}/drafts/generate`, { limit: 3 });

  const exportSummaries = [];
  if (drafts.ok) {
    for (const draft of drafts.body) {
      const exportResult = await request("POST", `/drafts/${draft.id}/export`, {});
      exportSummaries.push({
        draftId: draft.id,
        ok: exportResult.ok,
        status: exportResult.status,
        exportPath: exportResult.ok ? exportResult.body.exportPath : null,
        files: exportResult.ok ? exportResult.body.files : [],
        message: exportResult.ok ? exportResult.body.summaryMessage : JSON.stringify(exportResult.body)
      });
    }
  }

  const planMap = new Map((plans.ok ? plans.body : []).map((plan) => [plan.id, plan]));

  return {
    caseName,
    website,
    steps: {
      analysis: {
        ok: analysis.ok,
        status: analysis.status,
        nicheSummary: analysis.ok ? analysis.body.analysis.nicheSummary : null,
        keywords: analysis.ok ? analysis.body.analysis.keywordsJson : [],
        confidenceLevel: analysis.ok ? analysis.body.analysis.confidenceLevel : null,
        confidenceScore: analysis.ok ? analysis.body.analysis.confidenceScore : null,
        analyzedPageCount: analysis.ok ? analysis.body.analysis.analyzedPageCount : 0,
        title: analysis.ok ? analysis.body.analysis.extractedDataJson.title : null,
        h1: analysis.ok ? analysis.body.analysis.extractedDataJson.h1 : null,
        h2: analysis.ok ? analysis.body.analysis.extractedDataJson.h2Headings : [],
        textLength: analysis.ok ? analysis.body.analysis.extractedDataJson.mainTextContent.length : 0,
        pageTypes: analysis.ok ? analysis.body.pages.map((page) => page.pageType) : [],
        error: analysis.ok ? null : analysis.body
      },
      opportunities: {
        ok: opportunities.ok,
        status: opportunities.status,
        summary: opportunities.ok ? opportunities.body.summaryMessage : null,
        skippedDuplicates: opportunities.ok ? opportunities.body.skippedDuplicatesCount : null,
        items: opportunities.ok ? opportunities.body.createdOpportunities.map(summarizeOpportunity) : [],
        error: opportunities.ok ? null : opportunities.body
      },
      plans: {
        ok: plans.ok,
        status: plans.status,
        count: plans.ok ? plans.body.length : 0,
        items: plans.ok ? plans.body.map(summarizePlan) : [],
        error: plans.ok ? null : plans.body
      },
      drafts: {
        ok: drafts.ok,
        status: drafts.status,
        count: drafts.ok ? drafts.body.length : 0,
        items: drafts.ok ? drafts.body.map((draft) => summarizeDraft(draft, planMap.get(draft.articlePlanId))) : [],
        error: drafts.ok ? null : drafts.body
      },
      exports: exportSummaries
    }
  };
}

async function runGrader(url) {
  const response = await request("POST", "/tools/content-gap-grader", { url });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: response.body
    };
  }

  return {
    ok: true,
    status: response.status,
    websiteName: response.body.websiteName,
    score: response.body.scores.overallScore,
    grade: response.body.scores.gradeLabel,
    confidenceLevel: response.body.analysisConfidenceLevel,
    confidenceScore: response.body.analysisConfidenceScore,
    topicGapCount: response.body.scores.topicGapCount,
    blogMomentumScore: response.body.scores.blogMomentumScore,
    quickWins: response.body.quickWinIdeas.map((idea) => ({
      topic: idea.topic,
      whyItMatters: idea.whyItMatters,
      difficulty: idea.estimatedDifficulty
    })),
    shareMessage: response.body.shareMessage
  };
}

async function main() {
  const cases = [
    {
      caseName: "simple-site",
      websiteInput: {
        name: "Northstar Bookkeeping",
        domain: "http://127.0.0.1:4010",
        language: "English",
        targetCountry: "United Kingdom",
        niche: "Bookkeeping services",
        tone: "Helpful, clear, trustworthy",
        contentGoal: "Generate more qualified local leads",
        publishingFrequency: "Weekly"
      }
    },
    {
      caseName: "content-heavy-site",
      websiteInput: {
        name: "Workflow Atlas",
        domain: "http://127.0.0.1:4011",
        language: "English",
        targetCountry: "United States",
        niche: "Operations consulting",
        tone: "Practical, expert, operational",
        contentGoal: "Generate qualified demo and consulting demand",
        publishingFrequency: "Twice per week"
      }
    },
    {
      caseName: "weak-site",
      websiteInput: {
        name: "Apex Growth",
        domain: "http://127.0.0.1:4012",
        language: "English",
        targetCountry: "Global",
        niche: "Growth consulting",
        tone: "Confident, commercial",
        contentGoal: "Generate more inbound leads",
        publishingFrequency: "Monthly"
      }
    }
  ];

  const pipelineResults = [];
  for (const siteCase of cases) {
    pipelineResults.push(await runCase(siteCase.caseName, siteCase));
  }

  const graderResults = {
    simple: await runGrader("http://127.0.0.1:4010"),
    contentHeavy: await runGrader("http://127.0.0.1:4011"),
    weak: await runGrader("http://127.0.0.1:4012"),
    invalidUrl: await runGrader("::::"),
    empty: await runGrader("http://127.0.0.1:4013"),
    missingHeadings: await runGrader("http://127.0.0.1:4014"),
    slow: await runGrader("http://127.0.0.1:4015")
  };

  const edgeCases = {
    invalidPipelineWebsite: await runCase("invalid-domain-site", {
      websiteInput: {
        name: "Broken URL Co",
        domain: "notaurl",
        language: "English",
        targetCountry: "Global",
        niche: "Consulting",
        tone: "Neutral",
        contentGoal: "Generate leads",
        publishingFrequency: "Weekly"
      }
    }),
    emptyPipelineWebsite: await runCase("empty-site", {
      websiteInput: {
        name: "Empty Site",
        domain: "http://127.0.0.1:4013",
        language: "English",
        targetCountry: "Global",
        niche: "Operations consulting",
        tone: "Neutral",
        contentGoal: "Generate leads",
        publishingFrequency: "Weekly"
      }
    }),
    missingHeadingsWebsite: await runCase("missing-headings-site", {
      websiteInput: {
        name: "Signal Stack",
        domain: "http://127.0.0.1:4014",
        language: "English",
        targetCountry: "Global",
        niche: "Workflow support",
        tone: "Clear, practical",
        contentGoal: "Generate consultations",
        publishingFrequency: "Weekly"
      }
    }),
    slowWebsite: await runCase("slow-site", {
      websiteInput: {
        name: "Slow Lane Systems",
        domain: "http://127.0.0.1:4015",
        language: "English",
        targetCountry: "Global",
        niche: "Workflow consulting",
        tone: "Calm, practical",
        contentGoal: "Generate consultations",
        publishingFrequency: "Weekly"
      }
    })
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "validation-results.json");
  const result = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    pipelineResults,
    graderResults,
    edgeCases
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, cases: pipelineResults.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
