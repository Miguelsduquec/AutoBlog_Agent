import { ArticlePlan, ContentOpportunity, OpportunityIntent, Website, WebsiteAnalysisRun } from "../types";
import { createId } from "../utils/ids";
import { formatKeywordAsTopic, normalizeText, titleCase } from "../utils/text";
import { buildContentCta, inferAudience } from "./contentHeuristics";

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

function basePhrase(opportunity: ContentOpportunity): string {
  const topic = opportunity.topic.trim();
  if (topic && topic !== opportunity.keyword) {
    return topic.replace(/[?]/g, "").trim();
  }

  return formatKeywordAsTopic(opportunity.keyword)
    .replace(/\bServices In\b/g, "Services in")
    .replace(/\bVs\b/g, "vs");
}

function buildTitle(
  opportunity: ContentOpportunity,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  audience: string
): string {
  const phrase = basePhrase(opportunity);
  const keyword = normalizeText(opportunity.keyword);

  if (opportunity.intent === "comparison") {
    return phrase.includes("vs") ? phrase : `${phrase}: Which Option Fits ${titleCase(audience)}?`;
  }

  if (opportunity.intent === "local") {
    return `${phrase}: A Guide for ${website.targetCountry} Buyers`;
  }

  if (opportunity.intent === "commercial") {
    if (keyword.includes("best")) {
      return `${phrase} for ${titleCase(audience)}`;
    }
    if (keyword.includes("cost")) {
      return `${phrase}: What ${titleCase(audience)} Should Budget For`;
    }
    return `How ${titleCase(audience)} Can Evaluate ${phrase}`;
  }

  if (keyword.startsWith("what is")) {
    return `${phrase}: Practical Guide for ${titleCase(audience)}`;
  }

  if (keyword.startsWith("how to")) {
    return `${phrase}: Step-by-Step Guide`;
  }

  const supportKeyword = analysis?.keywordsJson[0];
  if (supportKeyword && !normalizeText(phrase).includes(normalizeText(supportKeyword))) {
    return `${phrase}: Practical Advice for ${titleCase(supportKeyword)} Teams`;
  }

  return `${phrase}: Practical Guide`;
}

function buildSecondaryKeywords(
  opportunity: ContentOpportunity,
  analysis: WebsiteAnalysisRun | null,
  website: Website
): string[] {
  const keyword = normalizeText(opportunity.keyword);
  const cluster = normalizeText(opportunity.cluster);
  const base = keyword.replace(/^(what is|how to use|best|benefits of|common mistakes with)\s+/g, "").trim();
  const country = website.targetCountry.toLowerCase();
  const analysisKeywords = analysis?.keywordsJson.slice(0, 3) ?? [];

  const candidates = [
    `${base} guide`,
    `${base} checklist`,
    `${base} examples`,
    `${cluster} strategy`,
    `${cluster} best practices`,
    opportunity.intent === "commercial" ? `${base} pricing` : `${base} framework`,
    opportunity.intent === "comparison" ? `${base} alternatives` : `${base} implementation`,
    opportunity.intent === "local" ? `${base} ${country}` : `${base} for teams`,
    ...analysisKeywords.map((item) => `${item} ${base}`.trim())
  ];

  return dedupe(candidates)
    .map((candidate) => candidate.replace(/\b(checklist)\s+\1\b/gi, "$1"))
    .filter((candidate) => normalizeText(candidate) !== keyword)
    .filter((candidate) => new Set(normalizeText(candidate).split(" ").filter(Boolean)).size >= 2)
    .slice(0, 6);
}

function buildAngle(
  opportunity: ContentOpportunity,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  audience: string
): string {
  const nicheSummary = analysis?.nicheSummary ?? website.niche;

  if (opportunity.intent === "commercial") {
    return `Explain the business value of ${opportunity.cluster.toLowerCase()} with practical evaluation criteria for ${audience}, then connect the topic naturally to ${nicheSummary.toLowerCase()}.`;
  }

  if (opportunity.intent === "comparison") {
    return `Compare the main options clearly, surface trade-offs, and help ${audience} choose the right direction without turning the article into a sales page.`;
  }

  if (opportunity.intent === "local") {
    return `Ground the article in local buying considerations for ${website.targetCountry} readers while reinforcing the website's service credibility.`;
  }

  return `Teach the topic in plain language, connect it to ${website.niche.toLowerCase()}, and use practical examples that help ${audience} move from research to action.`;
}

function buildCta(website: Website): string {
  return buildContentCta(website);
}

function buildCoveragePoints(intent: OpportunityIntent): string {
  if (intent === "commercial") {
    return "the underlying problem, evaluation criteria, implementation considerations, and expected business outcomes";
  }

  if (intent === "comparison") {
    return "the main options, key differences, trade-offs, and who each path is best suited for";
  }

  if (intent === "local") {
    return "local considerations, budgeting factors, provider selection, and the next step for nearby buyers";
  }

  return "the core concept, common mistakes, practical examples, and the next actions readers should take";
}

function buildBrief(
  opportunity: ContentOpportunity,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  secondaryKeywords: string[],
  cta: string
): string {
  const supportingTerms = secondaryKeywords.slice(0, 3).join(", ");
  const context = analysis?.nicheSummary ?? `${website.name} serves ${website.niche.toLowerCase()}.`;

  return `Cover ${buildCoveragePoints(opportunity.intent)} for "${opportunity.keyword}". Anchor the article in ${context.toLowerCase()} and use supporting terms like ${supportingTerms}. Close with a clear path to ${cta.toLowerCase()}.`;
}

export class ArticlePlannerService {
  createPlan(
    website: Website,
    opportunity: ContentOpportunity,
    analysis: WebsiteAnalysisRun | null,
    existingPlan?: ArticlePlan | null
  ): ArticlePlan {
    const audience = inferAudience(website, analysis);
    const title = buildTitle(opportunity, website, analysis, audience);
    const secondaryKeywordsJson = buildSecondaryKeywords(opportunity, analysis, website);
    const cta = buildCta(website);

    return {
      id: existingPlan?.id ?? createId("plan"),
      websiteId: website.id,
      opportunityId: opportunity.id,
      title,
      targetKeyword: opportunity.keyword,
      secondaryKeywordsJson,
      searchIntent: opportunity.intent,
      angle: buildAngle(opportunity, website, analysis, audience),
      cta,
      brief: buildBrief(opportunity, website, analysis, secondaryKeywordsJson, cta),
      status: "planned",
      createdAt: existingPlan?.createdAt ?? new Date().toISOString()
    };
  }
}
