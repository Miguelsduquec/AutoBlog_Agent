import { AnalysisConfidenceLevel, CrawlResultPage, ExtractedWebsiteData } from "../types";
import { normalizeText, titleCase, trimToLength } from "../utils/text";
import { getLanguageStopWords } from "./queryLocalization";

const GENERIC_WORDS = new Set([
  "home",
  "homepage",
  "services",
  "solutions",
  "resources",
  "blog",
  "insights",
  "about",
  "support",
  "team",
  "teams",
  "business",
  "businesses",
  "modern",
  "latest",
  "updated"
]);

const VAGUE_PHRASE_PATTERNS = [
  /^operations consulting$/i,
  /^operations guidance$/i,
  /^business systems$/i,
  /^global market focus$/i,
  /^website preview$/i,
  /^modern teams$/i,
  /^business productivity$/i,
  /^content marketing$/i,
  /^consulting services$/i,
  /^workflow support$/i,
  /^we help businesses grow$/i,
  /^latest insights$/i,
  /^comparison articles$/i,
  /^microsoft 365$/i
];

type WeightedText = {
  text: string;
  weight: number;
};

type AnalysisSummaryContext = {
  name: string;
  niche: string;
  targetCountry: string;
};

export type AnalysisConfidence = {
  confidenceLevel: AnalysisConfidenceLevel;
  confidenceScore: number;
};

function uniqueStrings(values: string[]): string[] {
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

function trimPhrase(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value: string, language = "English"): string[] {
  const stopWords = getLanguageStopWords(language);

  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !stopWords.has(token) && !GENERIC_WORDS.has(token));
}

function countDistinctMeaningfulWords(value: string, language = "English"): number {
  return new Set(tokenize(value, language)).size;
}

function stripSiteName(value: string, siteName?: string): string {
  const cleaned = trimPhrase(value);
  if (!cleaned) {
    return "";
  }

  const variants = [siteName, cleaned.split("|")[0], cleaned.split(" - ")[0]]
    .map((item) => trimPhrase(item ?? ""))
    .filter(Boolean);

  let result = cleaned;
  for (const variant of variants) {
    if (variant && result !== variant) {
      result = result.replace(new RegExp(`^${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[|:-]\\s*`, "i"), "");
      result = result.replace(new RegExp(`\\s*[|:-]\\s*${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "");
    }
  }

  return trimPhrase(result || cleaned);
}

function pagePriority(page: CrawlResultPage): number {
  if (page.pageType === "homepage") {
    return 5;
  }
  if (page.pageType === "blog-support") {
    return 4;
  }
  if (page.pageType === "service" || page.pageType === "product") {
    return 3;
  }
  if (page.pageType === "about") {
    return 2;
  }
  return 1;
}

function phraseFromTitle(title: string, siteName?: string): string {
  const cleaned = stripSiteName(title, siteName);
  const parts = cleaned.split(/\s[|:-]\s/).map(trimPhrase).filter(Boolean);
  const selected = parts.find((part) => normalizeText(part).split(" ").length >= 2) ?? cleaned;
  return trimPhrase(selected);
}

function sanitizeSignalText(value: string, siteName?: string): string {
  return trimPhrase(
    stripSiteName(value, siteName)
      .replace(/[|/()]/g, " ")
      .replace(/\b(we help|we provide|learn|latest|updated|services|solutions|resources)\b/gi, "")
      .replace(/\bfor modern teams\b/gi, "for teams")
      .replace(/\bfor scaling teams\b/gi, "for growing teams")
      .replace(/\s+/g, " ")
  );
}

function splitSignalParts(value: string, siteName?: string): string[] {
  return sanitizeSignalText(value, siteName)
    .split(/[.!?]/)
    .flatMap((part) => part.split(/\s[-:]\s/))
    .map(trimPhrase)
    .filter(Boolean);
}

function generateNgrams(tokens: string[], minLength = 2, maxLength = 5): string[] {
  const phrases: string[] = [];

  for (let size = minLength; size <= Math.min(maxLength, tokens.length); size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      phrases.push(tokens.slice(index, index + size).join(" "));
    }
  }

  return phrases;
}

function domainSpecificityBoost(phrase: string): number {
  const normalized = normalizeText(phrase);

  if (/\b(process automation|workflow automation|approval workflows)\b/.test(normalized)) {
    return 10;
  }
  if (/\b(sop|standard operating procedure|playbook|documentation|knowledge systems?)\b/.test(normalized)) {
    return 9;
  }
  if (/\b(microsoft 365|sharepoint intranet|teams governance|power platform|power automate)\b/.test(normalized)) {
    return 9;
  }
  if (/\b(bookkeeping|cash flow|monthly close|reconciliation|reporting setup)\b/.test(normalized)) {
    return 8;
  }
  if (/\b(landscape design|garden renovation|patios|paving|outdoor renovation)\b/.test(normalized)) {
    return 8;
  }

  return 0;
}

function isMeaningfulPhrase(value: string, language = "English"): boolean {
  const normalized = normalizeText(value);
  const tokens = tokenize(value, language);

  if (tokens.length < 2 || tokens.length > 5) {
    return false;
  }

  if (VAGUE_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  if (normalized.includes(" and ") && tokens.length >= 4) {
    return false;
  }

  if (/^(what|how|best|examples|common|why)\b/i.test(normalized)) {
    return false;
  }

  if (new Set(tokens).size < 2) {
    return false;
  }

  const firstToken = tokens[0];
  const lastToken = tokens[tokens.length - 1];
  if (GENERIC_WORDS.has(firstToken) || GENERIC_WORDS.has(lastToken)) {
    return false;
  }

  if (tokens.some((token, index) => token === tokens[index - 1])) {
    return false;
  }

  return true;
}

function collectPhraseScores(segments: WeightedText[], language = "English", siteName?: string): Map<string, number> {
  const scores = new Map<string, number>();

  for (const segment of segments) {
    for (const part of splitSignalParts(segment.text, siteName)) {
      const exactTokens = tokenize(part, language);
      const exactPhrase = exactTokens.join(" ");

      if (isMeaningfulPhrase(exactPhrase, language)) {
        scores.set(exactPhrase, (scores.get(exactPhrase) ?? 0) + segment.weight + 6 + domainSpecificityBoost(exactPhrase));
      }

      const phrases = generateNgrams(exactTokens, 2, 5);
      for (const phrase of phrases) {
        if (!isMeaningfulPhrase(phrase, language)) {
          continue;
        }

        const lengthBonus = phrase.split(" ").length >= 3 ? 3 : 1;
        scores.set(phrase, (scores.get(phrase) ?? 0) + segment.weight + lengthBonus + domainSpecificityBoost(phrase));
      }
    }
  }

  return scores;
}

function sortPhrases(scores: Map<string, number>): string[] {
  return [...scores.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return right[0].length - left[0].length;
    })
    .map(([phrase]) => phrase);
}

export function extractKeywordsFromSignals(title: string, h1: string, h2Headings: string[], language = "English"): string[] {
  const segments: WeightedText[] = [
    { text: phraseFromTitle(title), weight: 11 },
    { text: h1, weight: 10 },
    ...h2Headings.map((heading) => ({ text: heading, weight: 7 }))
  ];

  return sortPhrases(collectPhraseScores(segments, language)).slice(0, 8);
}

export function mergeExtractedDataFromPages(pages: CrawlResultPage[], siteName?: string): ExtractedWebsiteData {
  const ordered = [...pages].sort((left, right) => pagePriority(right) - pagePriority(left));
  const homepage = ordered.find((page) => page.pageType === "homepage") ?? ordered[0];
  const combinedText = trimToLength(
    ordered
      .map((page) => page.contentExtract)
      .filter(Boolean)
      .join(" "),
    3200
  );
  const combinedHeadings = uniqueStrings(
    ordered.flatMap((page) => page.h2Headings.map((heading) => trimPhrase(heading))).filter((heading) => heading.length >= 3)
  ).slice(0, 14);

  return {
    url: homepage?.url ?? "",
    title: phraseFromTitle(homepage?.title ?? "", siteName) || homepage?.title || "",
    metaDescription: homepage?.metaDescription ?? "",
    h1: homepage?.h1 || homepage?.title || "",
    h2Headings: combinedHeadings,
    mainTextContent: combinedText,
    pageSignals: ordered.map((page) => ({
      url: page.url,
      title: page.title,
      h1: page.h1,
      pageType: page.pageType,
      h2Headings: page.h2Headings,
      contentExtract: page.contentExtract,
      isFallback: page.isFallback
    }))
  };
}

export function inferNicheFromSignals(extractedData: ExtractedWebsiteData, keywords: string[]): string {
  const phraseSource = [extractedData.h1, extractedData.title, ...extractedData.h2Headings]
    .map((value) => phraseFromTitle(value))
    .find((value) => countDistinctMeaningfulWords(value) >= 2 && value.length >= 8);

  if (phraseSource) {
    return titleCase(phraseSource);
  }

  if (keywords.length >= 2) {
    return titleCase(keywords.slice(0, 2).join(" "));
  }

  if (keywords.length === 1) {
    return titleCase(keywords[0]);
  }

  return "Content Marketing";
}

export function extractPhraseCandidates(
  extractedData: ExtractedWebsiteData,
  websiteNiche: string,
  siteName: string,
  language = "English"
): string[] {
  const pageTextSegments: WeightedText[] = extractedData.pageSignals.flatMap((page) => {
    const weight = page.pageType === "homepage" ? 4 : page.pageType === "blog-support" ? 3 : 2;
    const contentParts = page.contentExtract
      .split(/[.!?]/)
      .map(trimPhrase)
      .filter((part) => part.length >= 20)
      .slice(0, 3)
      .map((text) => ({ text, weight }));

    return [
      { text: page.title, weight: weight + 5 },
      { text: page.h1, weight: weight + 5 },
      ...page.h2Headings.map((text) => ({ text, weight: weight + 4 })),
      ...contentParts
    ];
  });

  const signals: WeightedText[] = [
    { text: websiteNiche, weight: 3 },
    { text: extractedData.title, weight: 10 },
    { text: extractedData.h1, weight: 10 },
    ...extractedData.h2Headings.map((text) => ({ text, weight: 8 })),
    ...pageTextSegments
  ];

  const scoredPhrases = sortPhrases(collectPhraseScores(signals, language, siteName));
  const directCandidates = [
    websiteNiche,
    extractedData.h1,
    extractedData.title,
    ...extractedData.h2Headings,
    ...extractedData.pageSignals.flatMap((page) => [page.title, page.h1, ...page.h2Headings])
  ]
    .map((value) => sanitizeSignalText(value, siteName))
    .filter((value) => isMeaningfulPhrase(value, language));

  return uniqueStrings([...scoredPhrases, ...directCandidates]).slice(0, 14);
}

export function computeAnalysisConfidence(pages: CrawlResultPage[], extractedData: ExtractedWebsiteData): AnalysisConfidence {
  const totalTextLength = pages.reduce((sum, page) => sum + page.contentExtract.length, 0);
  const totalHeadings = pages.reduce((sum, page) => sum + page.h2Headings.length, 0);
  const topicDiversity = uniqueStrings(extractedData.h2Headings).length;
  const blogSupportPages = pages.filter((page) => page.pageType === "blog-support").length;
  const servicePages = pages.filter((page) => page.pageType === "service" || page.pageType === "product").length;
  const validPrimarySignals = [extractedData.title, extractedData.h1, extractedData.metaDescription].filter((value) =>
    Boolean(trimPhrase(value))
  ).length;
  const fallbackPages = pages.filter((page) => page.isFallback).length;

  const score = Math.max(
    8,
    Math.min(
      92,
      Math.round(
        6 +
          Math.min(26, pages.length * 5) +
          Math.min(28, totalTextLength / 85) +
          Math.min(16, totalHeadings * 2) +
          Math.min(10, topicDiversity * 2) +
          validPrimarySignals * 4 +
          (blogSupportPages > 0 ? 4 : 0) +
          (servicePages > 0 ? 4 : 0) -
          fallbackPages * 10
      )
    )
  );

  if (fallbackPages === pages.length && pages.length > 0) {
    return {
      confidenceLevel: "low",
      confidenceScore: Math.min(score, 28)
    };
  }

  if (score >= 72) {
    return {
      confidenceLevel: "high",
      confidenceScore: score
    };
  }

  if (score >= 42) {
    return {
      confidenceLevel: "medium",
      confidenceScore: score
    };
  }

  return {
    confidenceLevel: "low",
    confidenceScore: score
  };
}

export function generateMockNicheSummary(
  context: AnalysisSummaryContext,
  extractedData: ExtractedWebsiteData,
  keywords: string[]
): string {
  const dominantKeyword = keywords[0] ?? context.niche.toLowerCase();
  const supportingTopics = extractedData.h2Headings
    .slice(0, 3)
    .map((heading) => heading.toLowerCase())
    .join(", ");
  const pageTypes = uniqueStrings(extractedData.pageSignals.map((page) => page.pageType)).join(", ");

  return `${context.name} appears to focus on ${dominantKeyword} for ${context.targetCountry} audiences. The site messaging centers on ${extractedData.h1.toLowerCase()}, with supporting coverage around ${supportingTopics || context.niche.toLowerCase()}. Current signals were merged from ${pageTypes || "core"} pages to form a richer niche snapshot.`;
}

export function deriveWebsiteNameFromSignals(hostname: string, extractedData: ExtractedWebsiteData): string {
  const normalizedHostname = hostname.replace(/^www\./i, "");
  const hostnameLabel = normalizedHostname.split(".")[0]?.replace(/[-_]+/g, " ") || normalizedHostname;

  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHostname) && normalizedHostname !== "localhost") {
    return titleCase(hostnameLabel);
  }

  const rawHomepageTitle = extractedData.pageSignals.find((page) => page.pageType === "homepage")?.title ?? extractedData.pageSignals[0]?.title;
  const homepageBrand = rawHomepageTitle
    ?.split(/\s[|:-]\s/)
    .map(trimPhrase)
    .find((part) => part && normalizeText(part).split(" ").length <= 4);
  if (homepageBrand) {
    return titleCase(homepageBrand);
  }

  const titleCandidate = phraseFromTitle(extractedData.title);

  if (titleCandidate && countDistinctMeaningfulWords(titleCandidate) >= 2) {
    return titleCase(titleCandidate.split(/\s+/).slice(0, 4).join(" "));
  }

  const h1Candidate = trimPhrase(extractedData.h1);
  if (h1Candidate && countDistinctMeaningfulWords(h1Candidate) >= 2) {
    return titleCase(h1Candidate.split(/\s+/).slice(0, 4).join(" "));
  }

  return titleCase(hostnameLabel);
}
