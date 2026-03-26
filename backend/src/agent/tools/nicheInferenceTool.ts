import { CrawlResultPage, Website } from "../../types";

const NICHE_HINTS: Array<{ label: string; keywords: string[] }> = [
  { label: "Microsoft consulting", keywords: ["microsoft", "sharepoint", "teams", "office 365"] },
  { label: "Finance operations software", keywords: ["finance", "close", "accounting", "reconciliation", "controller"] },
  { label: "Landscape design services", keywords: ["garden", "landscape", "patio", "outdoor", "planting"] },
  { label: "SaaS operations platform", keywords: ["platform", "software", "automation", "workflow", "dashboard"] },
  { label: "Professional services", keywords: ["consulting", "advisory", "services", "implementation"] }
];

function scoreNiche(text: string, keywords: string[]): number {
  return keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
}

export class NicheInferenceTool {
  infer(website: Website, pages: CrawlResultPage[]): { niche: string; summary: string } {
    const corpus = `${website.name} ${website.niche} ${website.contentGoal} ${pages
      .map((page) => `${page.title} ${page.h1} ${page.headings.join(" ")} ${page.contentExtract}`)
      .join(" ")}`.toLowerCase();

    const bestMatch =
      NICHE_HINTS.map((entry) => ({
        ...entry,
        score: scoreNiche(corpus, entry.keywords)
      })).sort((left, right) => right.score - left.score)[0] ?? NICHE_HINTS[4];

    const inferredNiche = bestMatch.score > 0 ? bestMatch.label : website.niche;
    const pageTypes = [...new Set(pages.map((page) => page.pageType))].join(", ");
    const summary = `${website.name} appears to operate in ${inferredNiche.toLowerCase()} with a ${website.tone.toLowerCase()} voice. The site emphasizes ${pages
      .slice(0, 3)
      .map((page) => page.h1.toLowerCase())
      .join(", ")} and currently covers ${pageTypes}.`;

    return {
      niche: inferredNiche,
      summary
    };
  }
}
