import {
  computeAnalysisConfidence,
  deriveWebsiteNameFromSignals,
  extractKeywordsFromSignals,
  generateMockNicheSummary,
  inferNicheFromSignals,
  mergeExtractedDataFromPages
} from "../content/analysisInsights";
import { generateOpportunityCandidates } from "../content/opportunityGenerationCore";
import { WebsiteCrawler } from "../crawlers/websiteCrawler";
import {
  ContentGapGraderReport,
  ContentGapIdea,
  ExtractedWebsiteData,
  Website,
  WebsiteAnalysisRun
} from "../types";
import { normalizeText, titleCase } from "../utils/text";
import { isIpHostname, normalizeHttpUrl } from "../utils/url";

const COMMERCIAL_SIGNAL_PATTERN = /\b(demo|quote|consultation|pricing|software|service|solution|book|contact)\b/g;
const FRESHNESS_SIGNAL_PATTERN = /\b(2024|2025|2026|updated|latest|recent|new|this year)\b/g;
const COUNTRY_BY_TLD: Record<string, string> = {
  pt: "Portugal",
  uk: "United Kingdom",
  ie: "Ireland",
  us: "United States",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands"
};

const LANGUAGE_BY_TLD: Record<string, string> = {
  pt: "Portuguese",
  de: "German",
  es: "Spanish"
};

function clampScore(value: number): number {
  return Math.max(12, Math.min(96, Math.round(value)));
}

function websiteNameFromHostname(hostname: string): string {
  const label = hostname.replace(/^www\./i, "").split(".")[0]?.replace(/[-_]+/g, " ") || hostname;
  return titleCase(label);
}

function inferTargetCountry(hostname: string): string {
  const parts = hostname.replace(/^www\./i, "").split(".");
  const tld = parts[parts.length - 1]?.toLowerCase();
  return COUNTRY_BY_TLD[tld] ?? "Global";
}

function inferLanguage(hostname: string): string {
  const parts = hostname.replace(/^www\./i, "").split(".");
  const tld = parts[parts.length - 1]?.toLowerCase();
  return LANGUAGE_BY_TLD[tld] ?? "English";
}

function buildVirtualWebsite(url: string): Website {
  const hostname = new URL(url).hostname;
  const websiteName = isIpHostname(hostname) || hostname === "localhost" ? "Website Preview" : websiteNameFromHostname(hostname);
  const now = new Date().toISOString();

  return {
    id: "grader-preview",
    name: websiteName,
    domain: url,
    language: inferLanguage(hostname),
    targetCountry: inferTargetCountry(hostname),
    niche: "Content Marketing",
    tone: "Clear, credible, and practical",
    contentGoal: "Grow organic traffic with blog content",
    publishingFrequency: "Weekly",
    createdAt: now,
    updatedAt: now
  };
}

function priorityWeight(priority: ContentGapIdea["priority"]): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function difficultyWeight(difficulty: ContentGapIdea["estimatedDifficulty"]): number {
  if (difficulty === "low") {
    return 1;
  }
  if (difficulty === "medium") {
    return 2;
  }
  return 3;
}

function describeOpportunity(
  opportunity: Pick<ContentGapIdea, "intent" | "priority" | "estimatedDifficulty">,
  quickWin = false
): string {
  if (quickWin) {
    if (opportunity.estimatedDifficulty === "low") {
      return "Low difficulty and solid relevance make this one of the fastest articles to ship.";
    }
    if (opportunity.priority === "high") {
      return "This topic sits close to commercial intent and can create faster pipeline value.";
    }

    return "This is a practical next article because it expands topical depth without requiring a broad content program.";
  }

  if (opportunity.intent === "commercial") {
    return "Commercial research topics like this help educational traffic progress into real buying conversations.";
  }
  if (opportunity.intent === "comparison") {
    return "Comparison topics capture readers who are actively evaluating options and getting closer to a decision.";
  }
  if (opportunity.intent === "local") {
    return "Local intent terms strengthen trust and help the site compete for market-specific demand.";
  }

  return "This fills an educational gap that can support internal linking, topical authority, and future commercial articles.";
}

function toReportIdea(opportunity: Omit<ContentGapIdea, "whyItMatters">, quickWin = false): ContentGapIdea {
  return {
    ...opportunity,
    whyItMatters: describeOpportunity(opportunity, quickWin)
  };
}

function quickWinScore(idea: ContentGapIdea): number {
  const normalizedKeyword = normalizeText(idea.keyword);
  let score = idea.relevanceScore;

  score += priorityWeight(idea.priority) * 10;
  score -= difficultyWeight(idea.estimatedDifficulty) * 6;
  score += idea.intent === "informational" ? 8 : idea.intent === "commercial" ? 5 : -6;
  score += /\b(how to|how|common mistakes|examples of|what is|o que e|como|que es|ejemplos de|was ist|wie)\b/i.test(
    normalizedKeyword
  )
    ? 10
    : 0;
  score += /\b(process automation|workflow automation|sop|knowledge systems|bookkeeping|cash flow|reconciliation|landscape design|garden renovation|patio|paving|microsoft 365|sharepoint|teams governance)\b/i.test(
    normalizedKeyword
  )
    ? 10
    : 0;
  score -= /\b(global|empty|preview|services?|consulting|systems)\b/i.test(normalizedKeyword) ? 18 : 0;

  return score;
}

function weaknessSummary(scores: ContentGapGraderReport["scores"]): string {
  const weaknesses = [
    { key: "content coverage", score: scores.contentCoverageScore },
    { key: "blog momentum", score: scores.blogMomentumScore },
    { key: "commercial intent coverage", score: scores.commercialIntentCoverage },
    { key: "freshness", score: scores.freshnessScore }
  ]
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
    .map((item) => item.key);

  return weaknesses.join(" and ");
}

function computeScores(
  pages: WebsiteAnalysisRun["extractedDataJson"]["pageSignals"],
  extractedData: ExtractedWebsiteData,
  analysis: WebsiteAnalysisRun,
  ideas: ContentGapIdea[]
): ContentGapGraderReport["scores"] {
  const totalHeadingCount = pages.reduce((sum, page) => sum + page.h2Headings.length, 0);
  const totalTextLength = pages.reduce((sum, page) => sum + page.contentExtract.length, 0);
  const blogPages = pages.filter((page) => page.pageType === "blog-support").length;
  const supportPages = pages.filter((page) => ["homepage", "service", "product", "about"].includes(page.pageType)).length;
  const servicePages = pages.filter((page) => ["service", "product"].includes(page.pageType)).length;
  const topicDiversity = new Set(analysis.keywordsJson.map(normalizeText)).size;
  const corpus = normalizeText(
    pages.map((page) => `${page.title} ${page.h1} ${page.h2Headings.join(" ")} ${page.contentExtract}`).join(" ")
  );
  const freshnessSignals = (corpus.match(FRESHNESS_SIGNAL_PATTERN) ?? []).length;
  const commercialSignals = (corpus.match(COMMERCIAL_SIGNAL_PATTERN) ?? []).length;
  const confidenceModifier =
    analysis.confidenceLevel === "high" ? 0 : analysis.confidenceLevel === "medium" ? -4 : -12;

  const contentCoverageScore = clampScore(
    18 +
      pages.length * 7 +
      Math.min(18, totalHeadingCount * 1.8) +
      Math.min(14, topicDiversity * 2.2) +
      (totalTextLength > 2600 ? 18 : totalTextLength > 1700 ? 12 : totalTextLength > 900 ? 7 : totalTextLength > 400 ? 3 : 0) +
      (extractedData.metaDescription ? 5 : 0) +
      confidenceModifier -
      (blogPages === 0 ? 8 : 0)
  );

  const blogMomentumScore = clampScore(
    10 +
      blogPages * 24 +
      Math.min(14, supportPages * 4) +
      (corpus.includes("blog") || corpus.includes("resources") || corpus.includes("insights") ? 10 : 0) +
      (freshnessSignals > 0 ? 8 : 0) +
      confidenceModifier
  );

  const commercialIntentCoverage = clampScore(
    16 +
      Math.min(26, servicePages * 10) +
      Math.min(22, commercialSignals * 5) +
      (corpus.includes("book a") || corpus.includes("request a") || corpus.includes("contact") ? 8 : 0) +
      confidenceModifier
  );

  const freshnessScore = clampScore(
    14 +
      Math.min(24, freshnessSignals * 8) +
      Math.min(14, blogPages * 7) +
      (pages.length >= 4 ? 8 : pages.length >= 3 ? 4 : 0) +
      (totalTextLength > 1600 ? 8 : totalTextLength > 900 ? 4 : 0) +
      confidenceModifier
  );

  const topicGapCount = Math.max(
    3,
    Math.min(
      16,
      Math.round(
        ideas.filter((idea) => idea.relevanceScore >= 58).length * 0.8 +
          (blogPages === 0 ? 2 : 0) +
          (pages.length <= 2 ? 2 : 0) +
          (contentCoverageScore < 60 ? 2 : 0) -
          Math.min(3, topicDiversity / 3)
      )
    )
  );

  const gapPenaltyScore = Math.max(18, 100 - topicGapCount * 6);
  const overallScore = Math.round(
    contentCoverageScore * 0.3 +
      blogMomentumScore * 0.2 +
      commercialIntentCoverage * 0.2 +
      freshnessScore * 0.15 +
      gapPenaltyScore * 0.15
  );

  let gradeLabel = "F";
  if (overallScore >= 85) {
    gradeLabel = "A";
  } else if (overallScore >= 72) {
    gradeLabel = "B";
  } else if (overallScore >= 58) {
    gradeLabel = "C";
  } else if (overallScore >= 44) {
    gradeLabel = "D";
  }

  return {
    overallScore,
    gradeLabel,
    contentCoverageScore,
    blogMomentumScore,
    topicGapCount,
    commercialIntentCoverage,
    freshnessScore
  };
}

function buildOverview(report: ContentGapGraderReport["scores"], confidenceLevel: WebsiteAnalysisRun["confidenceLevel"]): string {
  const weakAreas = [
    report.contentCoverageScore < 60 ? "thin content coverage" : "",
    report.blogMomentumScore < 60 ? "low blog momentum" : "",
    report.commercialIntentCoverage < 60 ? "limited commercial intent coverage" : "",
    report.freshnessScore < 60 ? "weak freshness signals" : ""
  ].filter(Boolean);

  const confidenceNote =
    confidenceLevel === "low"
      ? " Confidence is low because the website exposed limited crawlable content, so treat the score as directional."
      : confidenceLevel === "medium"
        ? " Confidence is medium, so the score is useful but still based on partial website signals."
        : "";

  if (weakAreas.length === 0) {
    return `This site already shows decent content foundations, but there is still room to expand topic depth and publishing consistency.${confidenceNote}`;
  }

  if (weakAreas.length === 1) {
    return `The strongest gap right now is ${weakAreas[0]}, which makes it harder for the site to build compounding organic traffic.${confidenceNote}`;
  }

  return `The site shows ${weakAreas.slice(0, 2).join(" and ")}, which suggests there is meaningful room to grow blog support content.${confidenceNote}`;
}

export class ContentGapGraderService {
  constructor(private readonly crawler = new WebsiteCrawler()) {}

  async gradeWebsite(inputUrl: string): Promise<ContentGapGraderReport> {
    const websiteUrl = normalizeHttpUrl(inputUrl);
    const website = buildVirtualWebsite(websiteUrl);
    const crawledPages = await this.crawler.crawlWebsite(website);
    const extractedData = mergeExtractedDataFromPages(crawledPages, website.name);
    const extractedKeywords = extractKeywordsFromSignals(
      extractedData.title,
      extractedData.h1,
      extractedData.h2Headings,
      website.language
    );
    const inferredNiche = inferNicheFromSignals(extractedData, extractedKeywords);
    const confidence = computeAnalysisConfidence(crawledPages, extractedData);
    const resolvedWebsiteName = deriveWebsiteNameFromSignals(new URL(websiteUrl).hostname, extractedData);

    const websiteContext: Website = {
      ...website,
      name: resolvedWebsiteName,
      niche: inferredNiche
    };

    const analysis: WebsiteAnalysisRun = {
      id: "grader-analysis",
      websiteId: websiteContext.id,
      nicheSummary: generateMockNicheSummary(websiteContext, extractedData, extractedKeywords),
      contentPillarsJson: extractedKeywords,
      keywordsJson: extractedKeywords,
      extractedDataJson: extractedData,
      analyzedPageCount: crawledPages.length,
      confidenceLevel: confidence.confidenceLevel,
      confidenceScore: confidence.confidenceScore,
      status: "analyzed",
      createdAt: new Date().toISOString()
    };

    const generatedIdeas = generateOpportunityCandidates(websiteContext, analysis, [], 12).opportunities
      .slice()
      .sort((left, right) => {
        if (priorityWeight(right.priority) !== priorityWeight(left.priority)) {
          return priorityWeight(right.priority) - priorityWeight(left.priority);
        }

        if (right.relevanceScore !== left.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }

        return difficultyWeight(left.estimatedDifficulty) - difficultyWeight(right.estimatedDifficulty);
      })
      .map((opportunity) =>
        toReportIdea({
          keyword: opportunity.keyword,
          topic: opportunity.topic,
          cluster: opportunity.cluster,
          intent: opportunity.intent,
          priority: opportunity.priority,
          relevanceScore: opportunity.relevanceScore,
          estimatedDifficulty: opportunity.estimatedDifficulty
        })
      );

    const topMissingOpportunities = generatedIdeas.slice(0, 5);
    const quickWinCandidates = generatedIdeas
      .filter(
        (idea) =>
          idea.relevanceScore >= 58 &&
          idea.intent !== "comparison" &&
          !/\b(global|empty|services?|preview|consulting|systems)\b/i.test(idea.keyword) &&
          idea.estimatedDifficulty !== "high"
      )
      .sort((left, right) => quickWinScore(right) - quickWinScore(left));
    const quickWinIdeas = (quickWinCandidates.length >= 3 ? quickWinCandidates : generatedIdeas.slice().sort((left, right) => quickWinScore(right) - quickWinScore(left)))
      .slice(0, 3)
      .map((idea) => ({
        ...idea,
        whyItMatters: describeOpportunity(idea, true)
      }));

    const scores = computeScores(extractedData.pageSignals, extractedData, analysis, generatedIdeas);
    const topWeakness = weaknessSummary(scores);

    return {
      websiteUrl,
      hostname: new URL(websiteUrl).hostname,
      websiteName: websiteContext.name,
      nicheSummary: analysis.nicheSummary,
      overview: buildOverview(scores, confidence.confidenceLevel),
      extractedKeywords,
      analyzedPageCount: crawledPages.length,
      analysisConfidenceLevel: confidence.confidenceLevel,
      analysisConfidenceScore: confidence.confidenceScore,
      analyzedPages: crawledPages.map((page) => ({
        url: page.url,
        title: page.title,
        pageType: page.pageType
      })),
      scores,
      topMissingOpportunities,
      quickWinIdeas,
      generatedAt: new Date().toISOString(),
      shareMessage: `Content Gap Grader: ${websiteContext.name} scored ${scores.overallScore}/100. Biggest gaps: ${topWeakness}. Quick-win article idea: ${quickWinIdeas[0]?.topic ?? "publish a niche-specific how-to article"}.`
    };
  }
}
