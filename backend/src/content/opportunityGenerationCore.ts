import {
  ContentOpportunity,
  OpportunityDifficulty,
  OpportunityIntent,
  OpportunityPriority,
  Website,
  WebsiteAnalysisRun
} from "../types";
import { createId } from "../utils/ids";
import { formatKeywordAsTopic, formatSearchQuery, normalizeText, titleCase } from "../utils/text";
import { extractPhraseCandidates } from "./analysisInsights";
import { inferAudience } from "./contentHeuristics";
import { buildNicheEnrichment, NicheEnrichmentResult } from "./nicheEnrichment";
import { getLocalizedQueryTemplates, getQueryIntentPrefixes, OpportunityQueryContext } from "./queryLocalization";

type EditorialFamily =
  | "works"
  | "why-fails"
  | "when-to-use"
  | "signs-you-need"
  | "explained"
  | "without"
  | "mistakes-cost"
  | "benefit"
  | "comparison";

type CandidateRecord = ContentOpportunity & {
  qualityScore: number;
  templateId: string;
  basePhrase: string;
  comparison: string;
  cluster: string;
};

const GENERIC_PHRASES = new Set([
  "business teams",
  "buyers",
  "services",
  "solutions",
  "blog",
  "resources",
  "insights",
  "website preview",
  "content marketing",
  "global market focus",
  "operations consulting",
  "business systems",
  "microsoft 365"
]);

const WEAK_PHRASE_PATTERNS = [
  /^for\b/i,
  /^support for\b/i,
  /^generate\b/i,
  /^businesses grow\b/i,
  /^delivery approach\b/i,
  /^customer outcomes\b/i,
  /^global market focus\b/i,
  /^core services\b/i,
  /^operations consulting$/i,
  /^growth consulting$/i,
  /^business systems$/i
];

const UNREALISTIC_QUERY_PATTERNS = [
  /\b(global market focus|business systems|website preview|operations consulting|growth consulting)\b/i,
  /\b(checklist|cost guide|strategy)\b/i,
  /\b(latest insights|comparison articles)\b/i
];

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(" ").filter(Boolean));

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

export function isSimilarKeyword(candidate: string, existing: string): boolean {
  const left = normalizeText(candidate);
  const right = normalizeText(existing);
  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left) || overlapScore(left, right) >= 0.72;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(value.trim());
  }

  return output;
}

function cleanPhrase(value: string): string {
  return value
    .replace(/\b([a-z]+)s and ([a-z]+)\b/gi, (_match, left: string, right: string) => `${left} ${right}`)
    .replace(/\b(updated|latest|guide|services?|resources|insights)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMeaningfulPhrase(value: string): boolean {
  const normalized = normalizeText(value);
  const tokens = normalized.split(" ").filter(Boolean);

  if (tokens.length < 2 || tokens.length > 5) {
    return false;
  }

  if (GENERIC_PHRASES.has(normalized)) {
    return false;
  }

  if (WEAK_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return new Set(tokens).size >= 2;
}

function isMeaningfulQuery(value: string): boolean {
  const normalized = normalizeText(value);
  const tokens = normalized.split(" ").filter(Boolean);

  if (tokens.length < 3 || tokens.length > 10) {
    return false;
  }

  if (UNREALISTIC_QUERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return new Set(tokens).size >= 3;
}

function phraseSpecificityScore(phrase: string): number {
  const normalized = normalizeText(phrase);
  const tokens = normalized.split(" ").filter(Boolean);
  let score = Math.min(14, tokens.length * 2);

  if (/\b(process automation|workflow automation|approval workflows)\b/.test(normalized)) {
    score += 18;
  } else if (/\b(sop|standard operating procedure|playbook|documentation)\b/.test(normalized)) {
    score += 16;
  } else if (/\b(knowledge systems?|knowledge base|intranet)\b/.test(normalized)) {
    score += 16;
  } else if (/\b(microsoft 365|teams governance|sharepoint intranet|power platform|power automate)\b/.test(normalized)) {
    score += 16;
  } else if (/\b(bookkeeping|cash flow|reconciliation|monthly close|reporting)\b/.test(normalized)) {
    score += 14;
  } else if (/\b(landscape design|garden renovation|outdoor renovation|patios?|paving)\b/.test(normalized)) {
    score += 14;
  } else if (/\b(consulting|solutions|systems)\b/.test(normalized)) {
    score -= 10;
  }

  if (normalized.includes(" and ")) {
    score -= 10;
  }

  if (tokens.length === 2) {
    score += 4;
  }

  return Math.max(0, score);
}

function hasAudienceOrContextSignal(keyword: string, basePhrase: string, audience: string, enrichment: NicheEnrichmentResult): boolean {
  const normalizedKeyword = normalizeText(keyword);
  const normalizedBase = normalizeText(basePhrase);
  const normalizedAudience = normalizeText(audience);
  const audienceTokens = normalizedAudience.split(" ").filter(Boolean);
  const audienceSignal =
    normalizedAudience !== "buyers" &&
    (audienceTokens.some((token) => token.length >= 4 && normalizedKeyword.includes(token)) ||
      /\bsmall business|service business|homeowners|operations teams|growing teams\b/.test(normalizedKeyword));
  const contextSignal =
    normalizedBase.includes(" for ") ||
    phraseSpecificityScore(basePhrase) >= 16 ||
    enrichment.vocabulary.some((entry) => overlapScore(basePhrase, entry) >= 0.52);

  return audienceSignal || contextSignal;
}

function phraseRelevanceToSite(phrase: string, website: Website, analysis: WebsiteAnalysisRun): number {
  const siteCorpus = [
    website.niche,
    analysis.nicheSummary,
    analysis.keywordsJson.join(" "),
    analysis.extractedDataJson.title,
    analysis.extractedDataJson.h1,
    analysis.extractedDataJson.h2Headings.join(" "),
    analysis.extractedDataJson.pageSignals.map((page) => `${page.title} ${page.h1} ${page.h2Headings.join(" ")}`).join(" ")
  ].join(" ");

  return overlapScore(phrase, siteCorpus) + phraseSpecificityScore(phrase) / 100;
}

function clusterFromBase(basePhrase: string): string {
  const normalized = normalizeText(basePhrase);

  if (/\bprocess automation\b/.test(normalized)) {
    return "Process Automation";
  }
  if (/\bworkflow automation|approval workflows?\b/.test(normalized)) {
    return "Workflow Automation";
  }
  if (/\b(sop|standard operating procedure|playbook|operating cadence)\b/.test(normalized)) {
    return "SOPs";
  }
  if (/\b(knowledge systems?|knowledge base|documentation|sharepoint intranet|intranet)\b/.test(normalized)) {
    return "Knowledge Systems";
  }
  if (/\b(microsoft 365|teams governance|power platform|power automate|sharepoint)\b/.test(normalized)) {
    return "Microsoft 365 Operations";
  }
  if (/\b(bookkeeping|cash flow|reconciliation|monthly close|reporting)\b/.test(normalized)) {
    return "Bookkeeping Operations";
  }
  if (/\b(landscape design|garden renovation|outdoor renovation)\b/.test(normalized)) {
    return "Landscape Planning";
  }
  if (/\b(patios?|paving)\b/.test(normalized)) {
    return "Patio and Paving";
  }
  if (/\b(change management|handoff|delivery operations)\b/.test(normalized)) {
    return "Delivery Operations";
  }

  return titleCase(basePhrase.split(" ").slice(0, 3).join(" "));
}

function buildComparisonTerm(basePhrase: string, phrases: string[], keywords: string[], cluster: string): string {
  const normalizedBase = normalizeText(basePhrase);
  const alternatives = [...phrases, ...keywords].filter((candidate) => !isSimilarKeyword(candidate, basePhrase));
  const alternative = alternatives.find((candidate) => overlapScore(candidate, basePhrase) < 0.65);

  if (cluster === "Process Automation" || cluster === "Workflow Automation") {
    return "manual workflows";
  }
  if (cluster === "SOPs") {
    return "tribal knowledge";
  }
  if (cluster === "Knowledge Systems") {
    return "shared drives";
  }
  if (cluster === "Bookkeeping Operations") {
    return normalizedBase.includes("bookkeeping") ? "spreadsheets" : "manual bookkeeping";
  }
  if (cluster === "Microsoft 365 Operations") {
    return "google workspace";
  }
  if (cluster === "Landscape Planning" || cluster === "Patio and Paving") {
    return "DIY landscaping";
  }

  if (alternative) {
    return normalizeText(cleanPhrase(alternative));
  }

  return normalizedBase.includes("services") ? "in house support" : `${normalizedBase} tools`;
}

function countMatches(texts: string[], phrase: string): number {
  const normalizedPhrase = normalizeText(phrase);
  return texts.filter((value) => normalizeText(value).includes(normalizedPhrase)).length;
}

function scoreRelevance(
  keyword: string,
  basePhrase: string,
  cluster: string,
  analysis: WebsiteAnalysisRun,
  website: Website,
  intent: OpportunityIntent
): number {
  const extracted = analysis.extractedDataJson;
  const titleHits = countMatches([extracted.title], basePhrase);
  const h1Hits = countMatches([extracted.h1], basePhrase);
  const headingHits = countMatches(extracted.h2Headings, basePhrase);
  const pageHits = countMatches(
    extracted.pageSignals.map((page) => `${page.title} ${page.h1} ${page.h2Headings.join(" ")} ${page.contentExtract}`),
    basePhrase
  );
  const keywordOverlap = overlapScore(keyword, `${website.niche} ${analysis.nicheSummary}`);

  let score = 20;
  score += Math.min(20, titleHits * 16);
  score += Math.min(14, h1Hits * 12);
  score += Math.min(18, headingHits * 5);
  score += Math.min(16, pageHits * 3);
  score += Math.round(keywordOverlap * 16);
  score += Math.round(phraseSpecificityScore(basePhrase) * 0.55);
  score += cluster === "Process Automation" || cluster === "Workflow Automation" || cluster === "SOPs" ? 6 : 0;
  score += intent === "commercial" ? 5 : intent === "comparison" ? 6 : intent === "local" ? 4 : 2;
  score += analysis.confidenceLevel === "high" ? 6 : analysis.confidenceLevel === "medium" ? -2 : -18;

  return Math.max(26, Math.min(91, score));
}

function estimateDifficulty(keyword: string, intent: OpportunityIntent, cluster: string): OpportunityDifficulty {
  const normalized = normalizeText(keyword);
  const tokenCount = normalized.split(" ").filter(Boolean).length;

  if (intent === "comparison" || normalized.startsWith("best ")) {
    return "high";
  }

  if (cluster === "Microsoft 365 Operations" || tokenCount >= 7) {
    return "medium";
  }

  if (normalized.startsWith("examples of") || normalized.startsWith("common mistakes") || intent === "local") {
    return "low";
  }

  return tokenCount <= 4 ? "low" : "medium";
}

function determinePriority(intent: OpportunityIntent, relevanceScore: number, website: Website, cluster: string): OpportunityPriority {
  const commercialGoal = normalizeText(website.contentGoal);
  const commerciallyAligned =
    commercialGoal.includes("lead") || commercialGoal.includes("demo") || commercialGoal.includes("consult") || commercialGoal.includes("quote");

  if ((intent === "commercial" || intent === "local") && relevanceScore >= 72) {
    return "high";
  }

  if (
    (commerciallyAligned && relevanceScore >= 66) ||
    intent === "comparison" ||
    cluster === "Bookkeeping Operations" ||
    cluster === "Microsoft 365 Operations"
  ) {
    return "medium";
  }

  return relevanceScore >= 74 ? "medium" : "low";
}

function formatTitlePhrase(value: string): string {
  return formatKeywordAsTopic(value)
    .replace(/\bVs\b/g, "vs")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bFor\b/g, "for")
    .replace(/\bTo\b/g, "to")
    .replace(/\bOf\b/g, "of")
    .replace(/\bWithout\b/g, "without")
    .replace(/\bBefore\b/g, "before");
}

function basePhraseForTitle(basePhrase: string, audience: string): string {
  const normalizedAudience = normalizeText(audience);
  let phrase = basePhrase.trim();
  const normalizedPhrase = normalizeText(phrase);

  if (normalizedAudience && normalizedPhrase.includes(`for ${normalizedAudience}`)) {
    phrase = phrase.replace(new RegExp(`\\s+for\\s+${normalizedAudience.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim();
  }

  return phrase
    .replace(/\s+for\s+(small businesses|small business owners|service businesses|local service businesses|homeowners|operations teams|business teams|growing teams)$/i, "")
    .trim();
}

function inferOutcome(cluster: string, website: Website): string {
  if (cluster === "Bookkeeping Operations") {
    return "keep monthly numbers clearer";
  }
  if (cluster === "Process Automation" || cluster === "Workflow Automation") {
    return "reduce manual work";
  }
  if (cluster === "SOPs" || cluster === "Knowledge Systems") {
    return "make team handoffs more consistent";
  }
  if (cluster === "Landscape Planning" || cluster === "Patio and Paving") {
    return "avoid expensive project rework";
  }
  if (cluster === "Microsoft 365 Operations") {
    return "roll out changes with less friction";
  }

  if (normalizeText(website.contentGoal).includes("lead")) {
    return "turn research into qualified enquiries";
  }

  return "make better decisions sooner";
}

function inferConstraint(cluster: string): string {
  if (cluster === "Bookkeeping Operations") {
    return "adding more admin work";
  }
  if (cluster === "Process Automation" || cluster === "Workflow Automation") {
    return "adding another tool";
  }
  if (cluster === "SOPs" || cluster === "Knowledge Systems") {
    return "creating more documentation overhead";
  }
  if (cluster === "Landscape Planning" || cluster === "Patio and Paving") {
    return "wasting budget on the wrong materials";
  }
  if (cluster === "Microsoft 365 Operations") {
    return "switching your whole stack";
  }

  return "making the process harder";
}

function inferWarning(cluster: string): string {
  if (cluster === "Bookkeeping Operations") {
    return "month end becomes a scramble";
  }
  if (cluster === "Process Automation" || cluster === "Workflow Automation") {
    return "manual work slows the team down";
  }
  if (cluster === "SOPs" || cluster === "Knowledge Systems") {
    return "knowledge gaps start causing delays";
  }
  if (cluster === "Landscape Planning" || cluster === "Patio and Paving") {
    return "the project starts overrunning the budget";
  }
  if (cluster === "Microsoft 365 Operations") {
    return "governance issues pile up";
  }

  return "small issues become expensive";
}

function inferCost(cluster: string): string {
  if (cluster === "Bookkeeping Operations") {
    return "time every month";
  }
  if (cluster === "Process Automation" || cluster === "Workflow Automation") {
    return "hours of manual work";
  }
  if (cluster === "SOPs" || cluster === "Knowledge Systems") {
    return "handoff quality";
  }
  if (cluster === "Landscape Planning" || cluster === "Patio and Paving") {
    return "budget";
  }
  if (cluster === "Microsoft 365 Operations") {
    return "adoption momentum";
  }

  return "time and clarity";
}

function preferredEditorialFamilies(templateId: string, intent: OpportunityIntent): EditorialFamily[] {
  switch (templateId) {
    case "how-to":
      return ["works", "without", "benefit", "when-to-use"];
    case "how-to-improve":
      return ["without", "benefit", "when-to-use", "works"];
    case "what-is":
      return ["explained", "works", "benefit"];
    case "best-for":
      return ["benefit", "when-to-use", "explained"];
    case "versus":
      return ["comparison"];
    case "examples":
      return ["works", "explained", "benefit"];
    case "mistakes":
      return ["mistakes-cost", "signs-you-need", "why-fails"];
    case "why-fails":
      return ["why-fails", "signs-you-need"];
    case "local":
      return ["benefit", "explained", "when-to-use"];
    default:
      if (intent === "comparison") {
        return ["comparison"];
      }
      return ["benefit", "explained", "works"];
  }
}

function buildEditorialTitle(
  family: EditorialFamily,
  candidate: CandidateRecord,
  audience: string,
  website: Website
): string {
  const phrase = formatTitlePhrase(basePhraseForTitle(candidate.basePhrase, audience));
  const comparison = formatTitlePhrase(basePhraseForTitle(candidate.comparison, audience));
  const titledAudience = formatTitlePhrase(audience);
  const outcome = formatTitlePhrase(inferOutcome(candidate.cluster, website));
  const constraint = inferConstraint(candidate.cluster);
  const warning = formatTitlePhrase(inferWarning(candidate.cluster));
  const cost = formatTitlePhrase(inferCost(candidate.cluster));

  switch (family) {
    case "works":
      return `How ${phrase} Works for ${titledAudience}`;
    case "why-fails":
      return `Why ${phrase} Breaks Down for ${titledAudience}`;
    case "when-to-use":
      return `When to Use ${phrase} to ${outcome}`;
    case "signs-you-need":
      return `Signs You Need ${phrase} Before ${warning}`;
    case "explained":
      return `${phrase} Explained for ${titledAudience}`;
    case "without":
      return `How to Improve ${phrase} without ${constraint}`;
    case "mistakes-cost":
      return `${phrase} Mistakes That Cost ${titledAudience} ${cost}`;
    case "benefit":
      return `How ${phrase} Helps ${titledAudience} ${outcome}`;
    case "comparison":
      return `${phrase} vs ${comparison}: What Fits ${titledAudience}?`;
    default:
      return formatTitlePhrase(candidate.keyword);
  }
}

function assignEditorialTopics(sortedCandidates: CandidateRecord[], website: Website, audience: string): ContentOpportunity[] {
  const usedFamilies = new Map<EditorialFamily, number>();

  return sortedCandidates.map((candidate) => {
    const families = preferredEditorialFamilies(candidate.templateId, candidate.intent);
    const selectedFamily =
      families
        .slice()
        .sort((left, right) => (usedFamilies.get(left) ?? 0) - (usedFamilies.get(right) ?? 0))[0] ?? families[0];

    usedFamilies.set(selectedFamily, (usedFamilies.get(selectedFamily) ?? 0) + 1);

    const topic = buildEditorialTitle(selectedFamily, candidate, audience, website);
    const { qualityScore: _qualityScore, templateId: _templateId, basePhrase: _basePhrase, comparison: _comparison, ...opportunity } =
      candidate;

    return {
      ...opportunity,
      topic
    };
  });
}

function templateQualityBonus(keyword: string): number {
  const normalized = normalizeText(keyword);

  if (normalized.startsWith("how to set up") && normalized.includes("financial reporting")) {
    return 18;
  }
  if (normalized.startsWith("how to ")) {
    return 12;
  }
  if (normalized.startsWith("common mistakes in")) {
    return 10;
  }
  if (normalized.startsWith("examples of")) {
    return 8;
  }
  if (normalized.startsWith("what is") || normalized.startsWith("what are")) {
    return 6;
  }
  if (normalized.startsWith("best ")) {
    return normalized.includes(" buyers") ? -18 : 3;
  }
  if (normalized.includes(" vs ")) {
    return 1;
  }
  if (normalized.startsWith("why ")) {
    return -2;
  }

  return 0;
}

function enrichmentBonus(keyword: string, basePhrase: string, enrichment: NicheEnrichmentResult): number {
  if (!enrichment.shouldEnrich) {
    return 0;
  }

  const normalizedKeyword = normalizeText(keyword);
  const normalizedBase = normalizeText(basePhrase);
  let score = 0;

  if (normalizedKeyword.includes("small business") || normalizedKeyword.includes("homeowners") || normalizedKeyword.includes("operations teams")) {
    score += 12;
  }
  if (normalizedBase.includes(" for ")) {
    score += 10;
  }
  if (enrichment.subNiche && overlapScore(normalizedBase, enrichment.subNiche) >= 0.5) {
    score += 12;
  }

  return score;
}

function queryRealismScore(keyword: string, language: string, cluster: string): number {
  const normalized = normalizeText(keyword);
  const tokens = normalized.split(" ").filter(Boolean);

  if (tokens.length < 3 || tokens.length > 10) {
    return -100;
  }

  if (UNREALISTIC_QUERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return -100;
  }

  if (tokens.some((token, index) => token === tokens[index - 1])) {
    return -100;
  }

  let score = 42;
  if (getQueryIntentPrefixes(language).some((pattern) => pattern.test(normalized))) {
    score += 18;
  }
  if (normalized.includes(" vs ")) {
    score += 14;
  }
  if (tokens.length >= 4 && tokens.length <= 7) {
    score += 8;
  }
  if (/\bfor\b|\bpara\b|\bfur\b|\bfür\b|\bem\b|\ben\b/.test(normalized)) {
    score += 4;
  }
  if (cluster === "Process Automation" || cluster === "Workflow Automation" || cluster === "SOPs" || cluster === "Knowledge Systems") {
    score += 6;
  }
  if (/\bpatio paving\b|\blandscape design\b|\bgarden renovation\b|\bapproval workflows\b|\bprocess automation\b|\bworkflow automation\b/.test(normalized)) {
    score += 8;
  }

  return score;
}

function extractBasePhrases(website: Website, analysis: WebsiteAnalysisRun, audience: string): { basePhrases: string[]; enrichment: NicheEnrichmentResult } {
  const extracted = analysis.extractedDataJson;
  const phraseCandidates = extractPhraseCandidates(
    extracted,
    website.niche || analysis.nicheSummary,
    website.name,
    website.language
  )
    .map(cleanPhrase)
    .filter(isMeaningfulPhrase)
    .map((phrase) => ({
      phrase,
      score: phraseRelevanceToSite(phrase, website, analysis)
    }))
    .filter((entry) => entry.score >= 0.18 || phraseSpecificityScore(entry.phrase) >= 16)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.phrase);

  const fallbackCandidates = [website.niche, ...analysis.keywordsJson]
    .map(cleanPhrase)
    .filter(isMeaningfulPhrase);

  const initialBasePhrases = dedupe([...phraseCandidates, ...fallbackCandidates]).slice(0, 8);
  const enrichment = buildNicheEnrichment(website, analysis, initialBasePhrases, audience);
  const basePhrases = enrichment.shouldEnrich
    ? dedupe([...enrichment.enrichedPhrases, ...initialBasePhrases]).slice(0, 8)
    : initialBasePhrases;

  return {
    basePhrases,
    enrichment
  };
}

export function generateOpportunityCandidates(
  website: Website,
  analysis: WebsiteAnalysisRun,
  existingKeywords: string[] = [],
  limit = 10
): { opportunities: ContentOpportunity[]; skippedDuplicatesCount: number } {
  const audience = inferAudience(website, analysis);
  const { basePhrases, enrichment } = extractBasePhrases(website, analysis, audience);
  if (basePhrases.length === 0) {
    throw new Error("No usable phrase-based analysis signals were found for opportunity generation.");
  }

  const region = website.targetCountry;
  const templates = getLocalizedQueryTemplates(website.language);
  const createdAt = new Date().toISOString();
  const candidates: CandidateRecord[] = [];
  let skippedDuplicatesCount = 0;

  for (const basePhrase of basePhrases) {
    const cluster = clusterFromBase(basePhrase);
    const comparison = buildComparisonTerm(basePhrase, basePhrases, analysis.keywordsJson, cluster);
    const context: OpportunityQueryContext = { basePhrase, audience, region, comparison };

    for (const template of templates) {
      if (template.isEnabled && !template.isEnabled(context)) {
        continue;
      }

      const keyword = formatSearchQuery(template.buildKeyword(context));
      if (!keyword || !isMeaningfulQuery(keyword)) {
        continue;
      }

      if (enrichment.shouldEnrich && !hasAudienceOrContextSignal(keyword, basePhrase, audience, enrichment)) {
        continue;
      }

      const realismScore = queryRealismScore(keyword, website.language, cluster);
      if (realismScore < 50) {
        continue;
      }

      const duplicateFound =
        existingKeywords.some((existingKeyword) => isSimilarKeyword(keyword, existingKeyword)) ||
        candidates.some((opportunity) => isSimilarKeyword(keyword, opportunity.keyword));

      if (duplicateFound) {
        skippedDuplicatesCount += 1;
        continue;
      }

      const relevanceScore = scoreRelevance(keyword, basePhrase, cluster, analysis, website, template.intent);
      const qualityScore =
        relevanceScore +
        realismScore +
        phraseSpecificityScore(basePhrase) +
        templateQualityBonus(keyword) +
        enrichmentBonus(keyword, basePhrase, enrichment);

      candidates.push({
        id: createId("opp"),
        websiteId: website.id,
        keyword,
        topic: formatTitlePhrase(keyword),
        cluster,
        intent: template.intent,
        priority: determinePriority(template.intent, relevanceScore, website, cluster),
        relevanceScore,
        estimatedDifficulty: estimateDifficulty(keyword, template.intent, cluster),
        source: "analysis",
        status: "new",
        createdAt,
        qualityScore,
        templateId: template.id,
        basePhrase,
        comparison
      });
    }
  }

  const sortedCandidates = candidates
    .sort((left, right) => {
      if (right.qualityScore !== left.qualityScore) {
        return right.qualityScore - left.qualityScore;
      }

      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return left.keyword.length - right.keyword.length;
    })
    .slice(0, limit);

  const generated = assignEditorialTopics(sortedCandidates, website, audience);

  return {
    opportunities: generated,
    skippedDuplicatesCount
  };
}
