import { analysisRepository } from "../repositories/analysisRepository";
import { opportunityRepository } from "../repositories/contentRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import {
  ContentOpportunity,
  ExtractedWebsiteData,
  OpportunityDifficulty,
  OpportunityGenerationResult,
  OpportunityIntent,
  OpportunityPriority,
  Website,
  WebsiteAnalysisRun
} from "../types";
import { createId } from "../utils/ids";

type OpportunityTemplate = {
  pattern: (base: string, audience: string, region: string, comparison: string) => string;
  topic: (base: string, audience: string, region: string, comparison: string) => string;
  intent: OpportunityIntent;
};

const TEMPLATES: OpportunityTemplate[] = [
  {
    pattern: (base) => `what is ${base}`,
    topic: (base) => `What is ${titleCase(base)}?`,
    intent: "informational"
  },
  {
    pattern: (base) => `how to use ${base}`,
    topic: (base) => `How to Use ${titleCase(base)}`,
    intent: "informational"
  },
  {
    pattern: (base) => `best ${base}`,
    topic: (base) => `Best ${titleCase(base)}`,
    intent: "commercial"
  },
  {
    pattern: (base, audience) => `${base} for ${audience}`,
    topic: (base, audience) => `${titleCase(base)} for ${titleCase(audience)}`,
    intent: "commercial"
  },
  {
    pattern: (base, _audience, _region, comparison) => `${base} vs ${comparison}`,
    topic: (base, _audience, _region, comparison) => `${titleCase(base)} vs ${titleCase(comparison)}`,
    intent: "comparison"
  },
  {
    pattern: (base) => `common mistakes with ${base}`,
    topic: (base) => `Common Mistakes With ${titleCase(base)}`,
    intent: "informational"
  },
  {
    pattern: (base) => `benefits of ${base}`,
    topic: (base) => `Benefits of ${titleCase(base)}`,
    intent: "informational"
  },
  {
    pattern: (base) => `${base} checklist`,
    topic: (base) => `${titleCase(base)} Checklist`,
    intent: "informational"
  },
  {
    pattern: (base) => `${base} cost`,
    topic: (base) => `${titleCase(base)} Cost Guide`,
    intent: "commercial"
  },
  {
    pattern: (base, _audience, region) => `${base} in ${region}`,
    topic: (base, _audience, region) => `${titleCase(base)} in ${region}`,
    intent: "local"
  }
];

const STOP_WORDS = new Set([
  "what",
  "when",
  "where",
  "best",
  "with",
  "from",
  "that",
  "this",
  "your",
  "their",
  "there",
  "into",
  "about",
  "have",
  "will",
  "guide",
  "checklist"
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(normalize(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalize(right).split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

function isSimilarKeyword(candidate: string, existing: string): boolean {
  const left = normalize(candidate);
  const right = normalize(existing);
  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left) || overlapScore(left, right) >= 0.7;
}

function detectAudience(website: Website, analysis: WebsiteAnalysisRun): string {
  const corpus = normalize(`${website.niche} ${website.contentGoal} ${analysis.nicheSummary}`);

  if (corpus.includes("small business") || corpus.includes("smb")) {
    return "small businesses";
  }
  if (corpus.includes("finance")) {
    return "finance teams";
  }
  if (corpus.includes("garden") || corpus.includes("landscape")) {
    return "homeowners";
  }
  if (corpus.includes("consult")) {
    return "business teams";
  }

  return "businesses";
}

function buildComparisonTerm(basePhrase: string, keywords: string[]): string {
  const alternative = keywords.find((keyword) => normalize(keyword) !== normalize(basePhrase));
  return alternative ? normalize(alternative) : `${normalize(basePhrase)} services`;
}

function extractBasePhrases(analysis: WebsiteAnalysisRun): string[] {
  const extracted = analysis.extractedDataJson;
  const candidates = [
    ...analysis.keywordsJson,
    ...analysis.contentPillarsJson,
    extracted.title,
    extracted.h1,
    ...extracted.h2Headings
  ];

  const phrases = candidates
    .map((value) => normalize(value))
    .filter((value) => value.length >= 4)
    .map((value) =>
      value
        .split(" ")
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
        .slice(0, 5)
        .join(" ")
    )
    .filter((value) => value.length >= 4);

  return [...new Set(phrases)].slice(0, 6);
}

function scoreRelevance(keyword: string, basePhrase: string, extractedData: ExtractedWebsiteData): number {
  const normalizedKeyword = normalize(keyword);
  const normalizedBase = normalize(basePhrase);
  const title = normalize(extractedData.title);
  const h1 = normalize(extractedData.h1);
  const headings = extractedData.h2Headings.map(normalize);
  const body = normalize(extractedData.mainTextContent);

  let score = 55;

  if (title.includes(normalizedBase)) {
    score += 14;
  }
  if (h1.includes(normalizedBase)) {
    score += 16;
  }

  const headingMatches = headings.filter((heading) => heading.includes(normalizedBase) || heading.includes(normalizedKeyword)).length;
  score += Math.min(15, headingMatches * 6);

  if (body.includes(normalizedBase)) {
    score += 8;
  }

  if (keyword.includes("for ") || keyword.includes(" cost") || keyword.includes("best ")) {
    score += 4;
  }

  return Math.max(45, Math.min(98, score));
}

function estimateDifficulty(keyword: string, intent: OpportunityIntent): OpportunityDifficulty {
  const normalized = normalize(keyword);

  if (intent === "local" || normalized.split(" ").length >= 5) {
    return "low";
  }

  if (intent === "comparison" || normalized.includes("best") || normalized.includes("software") || normalized.includes("cost")) {
    return "high";
  }

  return "medium";
}

function determinePriority(intent: OpportunityIntent, relevanceScore: number): OpportunityPriority {
  if ((intent === "commercial" || intent === "local") && relevanceScore >= 72) {
    return "high";
  }

  if (intent === "comparison" || relevanceScore >= 68) {
    return "medium";
  }

  return "low";
}

function clusterFromBase(basePhrase: string): string {
  return titleCase(basePhrase.split(" ").slice(0, 3).join(" "));
}

export class OpportunityGeneratorService {
  generateForWebsite(websiteId: string, limit = 10): OpportunityGenerationResult {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const analysis = analysisRepository.getLatestByWebsiteId(websiteId);
    if (!analysis) {
      throw new Error("Website analysis is required before generating opportunities.");
    }

    const basePhrases = extractBasePhrases(analysis);
    if (basePhrases.length === 0) {
      throw new Error("No usable analysis keywords were found for opportunity generation.");
    }

    const existing = opportunityRepository.list(websiteId);
    const audience = detectAudience(website, analysis);
    const region = website.targetCountry;
    const createdAt = new Date().toISOString();
    const generated: ContentOpportunity[] = [];
    let skippedDuplicatesCount = 0;

    for (const basePhrase of basePhrases) {
      const comparison = buildComparisonTerm(basePhrase, analysis.keywordsJson);

      for (const template of TEMPLATES) {
        if (generated.length >= limit) {
          break;
        }

        const keyword = template.pattern(basePhrase, audience, region, comparison);
        const duplicateFound =
          existing.some((opportunity) => isSimilarKeyword(keyword, opportunity.keyword)) ||
          generated.some((opportunity) => isSimilarKeyword(keyword, opportunity.keyword));

        if (duplicateFound) {
          skippedDuplicatesCount += 1;
          continue;
        }

        const relevanceScore = scoreRelevance(keyword, basePhrase, analysis.extractedDataJson);
        const intent = template.intent;
        const generatedOpportunity: ContentOpportunity = {
          id: createId("opp"),
          websiteId,
          keyword,
          topic: template.topic(basePhrase, audience, region, comparison),
          cluster: clusterFromBase(basePhrase),
          intent,
          priority: determinePriority(intent, relevanceScore),
          relevanceScore,
          estimatedDifficulty: estimateDifficulty(keyword, intent),
          source: "analysis",
          status: "new",
          createdAt
        };

        generated.push(generatedOpportunity);
      }
    }

    const createdOpportunities = opportunityRepository.createMany(generated.slice(0, limit));
    const summaryMessage =
      createdOpportunities.length > 0
        ? `Created ${createdOpportunities.length} opportunities from the latest website analysis and skipped ${skippedDuplicatesCount} duplicates.`
        : `No new opportunities were created. Skipped ${skippedDuplicatesCount} duplicate candidates.`;

    return {
      createdOpportunities,
      skippedDuplicatesCount,
      summaryMessage
    };
  }
}
