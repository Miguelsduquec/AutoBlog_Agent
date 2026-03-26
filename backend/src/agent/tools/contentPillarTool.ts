import { CrawlResultPage, Website } from "../../types";

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "your",
  "into",
  "this",
  "will",
  "are",
  "our",
  "you",
  "about",
  "best",
  "guide"
]);

export class ContentPillarTool {
  infer(website: Website, pages: CrawlResultPage[]): string[] {
    const counts = new Map<string, number>();
    const segments = [
      website.niche,
      website.contentGoal,
      ...pages.flatMap((page) => [page.title, page.h1, ...page.headings])
    ];

    for (const segment of segments) {
      for (const token of segment.toLowerCase().split(/[^a-z0-9]+/)) {
        if (!token || token.length < 4 || STOP_WORDS.has(token)) {
          continue;
        }

        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }

    const topTokens = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([token]) => titleCase(token));

    const pillars = [...new Set([titleCase(website.niche), ...topTokens])];
    return pillars.slice(0, 4);
  }
}
