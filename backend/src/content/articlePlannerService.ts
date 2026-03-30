import { CONTENT_PROMPTS } from "../agent/prompts/contentPrompts";
import { ArticlePlan, ContentOpportunity, OpportunityIntent, Website, WebsiteAnalysisRun } from "../types";
import { createId } from "../utils/ids";

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalize(value);
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

  return titleCase(opportunity.keyword);
}

function detectAudience(website: Website, analysis: WebsiteAnalysisRun | null): string {
  const corpus = normalize(`${website.niche} ${website.contentGoal} ${analysis?.nicheSummary ?? ""}`);

  if (corpus.includes("finance")) {
    return "finance teams";
  }
  if (corpus.includes("small business") || corpus.includes("smb")) {
    return "small businesses";
  }
  if (corpus.includes("landscape") || corpus.includes("garden")) {
    return "homeowners";
  }
  if (corpus.includes("consult")) {
    return "business teams";
  }

  return "buyers";
}

function buildTitle(
  opportunity: ContentOpportunity,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  audience: string
): string {
  const phrase = basePhrase(opportunity);
  const keyword = normalize(opportunity.keyword);

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
    return `How ${titleCase(audience)} Evaluate ${phrase}`;
  }

  if (keyword.startsWith("what is")) {
    return `${phrase}: Practical Guide for ${titleCase(audience)}`;
  }

  if (keyword.startsWith("how to")) {
    return `${phrase}: Step-by-Step Guide`;
  }

  const supportKeyword = analysis?.keywordsJson[0];
  if (supportKeyword && !normalize(phrase).includes(normalize(supportKeyword))) {
    return `${phrase}: Practical Advice for ${titleCase(supportKeyword)} Teams`;
  }

  return `${phrase}: Practical Guide`;
}

function buildSecondaryKeywords(
  opportunity: ContentOpportunity,
  analysis: WebsiteAnalysisRun | null,
  website: Website
): string[] {
  const keyword = normalize(opportunity.keyword);
  const cluster = normalize(opportunity.cluster);
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

  return dedupe(candidates).filter((candidate) => normalize(candidate) !== keyword).slice(0, 6);
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
  const goal = normalize(website.contentGoal);

  if (goal.includes("demo") || goal.includes("walkthrough") || goal.includes("software")) {
    return "Request a demo";
  }
  if (goal.includes("quote") || goal.includes("local") || goal.includes("project")) {
    return "Request a quote";
  }
  if (goal.includes("design consultation")) {
    return "Book a design consultation";
  }
  if (goal.includes("lead") || goal.includes("consult") || goal.includes("qualified")) {
    return "Book a consultation";
  }

  return `Talk to ${website.name}`;
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
    const audience = detectAudience(website, analysis);
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
      angle: `${CONTENT_PROMPTS.planningAngle} ${buildAngle(opportunity, website, analysis, audience)}`,
      cta,
      brief: buildBrief(opportunity, website, analysis, secondaryKeywordsJson, cta),
      status: "planned",
      createdAt: existingPlan?.createdAt ?? new Date().toISOString()
    };
  }
}
