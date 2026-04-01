import { Website, WebsiteAnalysisRun } from "../types";
import { normalizeText } from "../utils/text";

type NicheProfile = {
  id: "bookkeeping" | "landscaping" | "consulting";
  matchTerms: string[];
  subNiches: string[];
  vocabulary: string[];
  expandPhrase: (phrase: string, audience: string) => string | null;
};

export type NicheEnrichmentResult = {
  shouldEnrich: boolean;
  nicheFamily: NicheProfile["id"] | null;
  subNiche: string | null;
  vocabulary: string[];
  enrichedPhrases: string[];
  reasons: string[];
};

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

function phraseTokenCount(value: string): number {
  return normalizeText(value).split(" ").filter(Boolean).length;
}

function isWeakPhrase(phrase: string): boolean {
  const normalized = normalizeText(phrase);
  const tokens = phraseTokenCount(phrase);

  if (tokens <= 2) {
    return true;
  }

  return /\b(reporting setup|cash flow visibility|cash flow|bookkeeping local|monthly bookkeeping|receipt cleanup|operations consulting|operations guidance|business systems|delivery operations)\b/.test(
    normalized
  );
}

function domainTokens(domain: string): string[] {
  try {
    return new URL(domain)
      .hostname.replace(/^www\./i, "")
      .split(/[.-]/)
      .map((token) => normalizeText(token))
      .filter(Boolean);
  } catch {
    return normalizeText(domain).split(" ").filter(Boolean);
  }
}

function bookkeepingAudience(audience: string): string {
  const normalized = normalizeText(audience);
  if (normalized.includes("service")) {
    return "service businesses";
  }
  return "small businesses";
}

function consultingAudience(audience: string): string {
  const normalized = normalizeText(audience);
  if (normalized.includes("grow")) {
    return "growing teams";
  }
  return "operations teams";
}

const PROFILES: NicheProfile[] = [
  {
    id: "bookkeeping",
    matchTerms: ["bookkeeping", "accounting", "tax", "cash flow", "reconciliation", "reporting"],
    subNiches: ["small business accounting", "financial reporting", "cash flow management", "tax reporting"],
    vocabulary: [
      "small business accounting",
      "financial reporting for small businesses",
      "cash flow planning for small businesses",
      "monthly bookkeeping for service businesses",
      "tax reporting for small businesses"
    ],
    expandPhrase: (phrase, audience) => {
      const normalized = normalizeText(phrase);
      const contextAudience = bookkeepingAudience(audience);

      if (normalized.includes("reporting")) {
        return `financial reporting for ${contextAudience}`;
      }
      if (normalized.includes("cash flow")) {
        return `cash flow planning for ${contextAudience}`;
      }
      if (normalized.includes("receipt")) {
        return `expense tracking for ${contextAudience}`;
      }
      if (normalized.includes("monthly bookkeeping")) {
        return `monthly bookkeeping for ${contextAudience}`;
      }
      if (normalized.includes("bookkeeping")) {
        return `bookkeeping for ${contextAudience}`;
      }

      return null;
    }
  },
  {
    id: "landscaping",
    matchTerms: ["landscape", "garden", "patio", "paving", "outdoor renovation", "lawn"],
    subNiches: ["garden design", "outdoor renovation", "patio design", "lawn care"],
    vocabulary: [
      "garden design ideas for homeowners",
      "garden renovation planning for homeowners",
      "patio design for homeowners",
      "outdoor renovation planning for homeowners"
    ],
    expandPhrase: (phrase) => {
      const normalized = normalizeText(phrase);

      if (normalized.includes("patio") || normalized.includes("paving")) {
        return "patio design for homeowners";
      }
      if (normalized.includes("garden renovation")) {
        return "garden renovation planning for homeowners";
      }
      if (normalized.includes("landscape design")) {
        return "landscape design ideas for homeowners";
      }
      if (normalized.includes("outdoor renovation")) {
        return "outdoor renovation planning for homeowners";
      }

      return null;
    }
  },
  {
    id: "consulting",
    matchTerms: ["consulting", "operations", "workflow", "automation", "process", "sop"],
    subNiches: ["process improvement", "workflow automation", "operations playbooks", "change management"],
    vocabulary: [
      "process improvement for operations teams",
      "workflow automation for operations teams",
      "knowledge systems for growing teams",
      "standard operating procedures for growing teams"
    ],
    expandPhrase: (phrase, audience) => {
      const normalized = normalizeText(phrase);
      const contextAudience = consultingAudience(audience);

      if (normalized.includes("operations consulting") || normalized.includes("operations guidance")) {
        return `process improvement for ${contextAudience}`;
      }
      if (normalized.includes("business systems")) {
        return `knowledge systems for ${contextAudience}`;
      }
      if (normalized.includes("delivery operations")) {
        return `workflow automation for ${contextAudience}`;
      }

      return null;
    }
  }
];

function inferProfile(website: Website, analysis: WebsiteAnalysisRun, basePhrases: string[]): NicheProfile | null {
  const corpus = normalizeText(
    [
      website.niche,
      website.contentGoal,
      website.domain,
      analysis.nicheSummary,
      analysis.keywordsJson.join(" "),
      basePhrases.join(" "),
      domainTokens(website.domain).join(" ")
    ].join(" ")
  );

  const scoredProfiles = PROFILES.map((profile) => ({
    profile,
    score: profile.matchTerms.reduce((sum, term) => sum + (corpus.includes(term) ? 1 : 0), 0)
  })).sort((left, right) => right.score - left.score);

  return scoredProfiles[0]?.score ? scoredProfiles[0].profile : null;
}

function selectSubNiche(profile: NicheProfile, website: Website, analysis: WebsiteAnalysisRun, basePhrases: string[]): string {
  const corpus = normalizeText(
    [website.niche, analysis.nicheSummary, analysis.keywordsJson.join(" "), basePhrases.join(" "), domainTokens(website.domain).join(" ")].join(
      " "
    )
  );

  return (
    profile.subNiches
      .map((candidate) => ({
        candidate,
        score: candidate
          .split(" ")
          .filter(Boolean)
          .reduce((sum, token) => sum + (corpus.includes(token) ? 1 : 0), 0)
      }))
      .sort((left, right) => right.score - left.score)[0]?.candidate ?? profile.subNiches[0]
  );
}

export function buildNicheEnrichment(website: Website, analysis: WebsiteAnalysisRun, basePhrases: string[], audience: string): NicheEnrichmentResult {
  const textLength = analysis.extractedDataJson.mainTextContent.length;
  const genericPhraseCount = basePhrases.filter(isWeakPhrase).length;
  const reasons: string[] = [];

  if (analysis.confidenceLevel !== "high") {
    reasons.push("confidence");
  }
  if (textLength < 950) {
    reasons.push("limited-content");
  }
  if (genericPhraseCount >= Math.max(2, Math.ceil(basePhrases.length / 2))) {
    reasons.push("generic-phrases");
  }

  const profile = inferProfile(website, analysis, basePhrases);
  const shouldEnrich = Boolean(profile) && (analysis.confidenceLevel !== "high" || (textLength < 850 && genericPhraseCount >= 2));

  if (!profile || !shouldEnrich) {
    return {
      shouldEnrich: false,
      nicheFamily: profile?.id ?? null,
      subNiche: null,
      vocabulary: [],
      enrichedPhrases: [],
      reasons
    };
  }

  const subNiche = selectSubNiche(profile, website, analysis, basePhrases);
  const expandedPhrases = basePhrases
    .filter((phrase) => isWeakPhrase(phrase))
    .map((phrase) => profile.expandPhrase(phrase, audience))
    .filter((phrase): phrase is string => Boolean(phrase));

  const enrichedPhrases = dedupe([...expandedPhrases, subNiche, ...profile.vocabulary]).slice(0, 8);

  return {
    shouldEnrich: true,
    nicheFamily: profile.id,
    subNiche,
    vocabulary: dedupe([...profile.vocabulary, subNiche]),
    enrichedPhrases,
    reasons
  };
}
