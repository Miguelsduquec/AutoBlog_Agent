import { ContentOpportunity, SeoAuditRun, Website, WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";

type TopicTemplate = {
  cluster: string;
  intent: ContentOpportunity["intent"];
  priority: ContentOpportunity["priority"];
  keywords: string[];
};

const TEMPLATE_LIBRARY: Array<{ match: string[]; topics: TopicTemplate[] }> = [
  {
    match: ["microsoft", "teams", "sharepoint"],
    topics: [
      {
        cluster: "Microsoft 365 adoption",
        intent: "informational",
        priority: "high",
        keywords: [
          "microsoft 365 migration checklist for small business",
          "sharepoint intranet best practices",
          "how to prepare for a teams rollout"
        ]
      },
      {
        cluster: "Teams governance",
        intent: "commercial",
        priority: "high",
        keywords: [
          "teams governance best practices",
          "microsoft teams governance checklist"
        ]
      }
    ]
  },
  {
    match: ["finance", "close", "accounting", "approval"],
    topics: [
      {
        cluster: "Month-end close",
        intent: "commercial",
        priority: "high",
        keywords: [
          "month end close automation software",
          "month end close process improvement",
          "close management workflow"
        ]
      },
      {
        cluster: "Approvals",
        intent: "informational",
        priority: "medium",
        keywords: [
          "approval workflow for finance teams",
          "finance approval automation best practices"
        ]
      }
    ]
  },
  {
    match: ["garden", "landscape", "patio", "outdoor"],
    topics: [
      {
        cluster: "Outdoor renovation",
        intent: "informational",
        priority: "high",
        keywords: [
          "garden renovation budget guide",
          "how to plan an outdoor renovation project"
        ]
      },
      {
        cluster: "Patio planning",
        intent: "informational",
        priority: "medium",
        keywords: [
          "best patio materials for uk gardens",
          "patio design ideas for small gardens"
        ]
      }
    ]
  }
];

function normalize(value: string): string {
  return value.toLowerCase();
}

function keywordExists(keyword: string, pages: WebsitePage[], existingKeywords: Set<string>): boolean {
  const loweredKeyword = normalize(keyword);
  return (
    existingKeywords.has(loweredKeyword) ||
    pages.some((page) =>
      normalize(`${page.title} ${page.h1} ${page.headingsJson.join(" ")}`).includes(loweredKeyword.slice(0, 18))
    )
  );
}

export class TopicDiscoveryService {
  discoverOpportunities(
    website: Website,
    analysis: WebsiteAnalysisRun | null,
    audit: SeoAuditRun | null,
    pages: WebsitePage[],
    existing: ContentOpportunity[],
    limit = 8
  ): ContentOpportunity[] {
    const corpus = normalize(`${website.niche} ${analysis?.nicheSummary ?? ""} ${analysis?.contentPillarsJson.join(" ") ?? ""}`);
    const existingKeywords = new Set(existing.map((item) => normalize(item.keyword)));
    const selectedLibrary =
      TEMPLATE_LIBRARY.find((entry) => entry.match.some((token) => corpus.includes(token))) ?? TEMPLATE_LIBRARY[0];
    const auditBoost = audit && audit.score < 80 ? 3 : 0;
    const createdAt = new Date().toISOString();
    const opportunities: ContentOpportunity[] = [];

    for (const topic of selectedLibrary.topics) {
      for (const keyword of topic.keywords) {
        if (keywordExists(keyword, pages, existingKeywords)) {
          continue;
        }

        opportunities.push({
          id: createId("opp"),
          websiteId: website.id,
          keyword,
          topic: keyword
            .split(" ")
            .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
            .join(" "),
          cluster: topic.cluster,
          intent: topic.intent,
          relevanceScore: Math.min(97, 82 + opportunities.length * 2 + auditBoost),
          estimatedDifficulty: opportunities.length > 2 ? "medium" : "low",
          priority: topic.priority,
          source: audit ? "analysis-plus-audit" : "analysis",
          status: "new",
          createdAt
        });
      }
    }

    if (analysis) {
      for (const pillar of analysis.contentPillarsJson.slice(0, 2)) {
        const keyword = `${pillar.toLowerCase()} best practices`;
        if (!keywordExists(keyword, pages, existingKeywords)) {
          opportunities.push({
            id: createId("opp"),
            websiteId: website.id,
            keyword,
            topic: `${pillar} Best Practices`,
            cluster: pillar,
            intent: "informational",
            relevanceScore: 78,
            estimatedDifficulty: "medium",
            priority: "medium",
            source: "pillar-expansion",
            status: "new",
            createdAt
          });
        }
      }
    }

    return opportunities.slice(0, limit);
  }
}
