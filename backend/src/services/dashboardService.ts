import { analysisRepository } from "../repositories/analysisRepository";
import { opportunityRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { DashboardSnapshot } from "../types";

export class DashboardService {
  getSnapshot(userId: string): DashboardSnapshot {
    const websites = websiteRepository.list(userId);
    const websiteIds = new Set(websites.map((website) => website.id));
    const analysisRuns = analysisRepository.listRecent(100).filter((run) => websiteIds.has(run.websiteId));
    const opportunities = opportunityRepository.list().filter((opportunity) => websiteIds.has(opportunity.websiteId));
    const analyzedPages = websites.reduce((count, website) => count + websitePageRepository.listByWebsiteId(website.id).length, 0);

    return {
      totals: {
        websites: websites.length,
        analysisRuns: analysisRuns.length,
        analyzedPages,
        opportunities: opportunities.length
      },
      recentAnalysisRuns: analysisRuns.slice(0, 5),
      topOpportunities: opportunities
        .sort((left, right) => right.relevanceScore - left.relevanceScore)
        .slice(0, 5)
    };
  }
}
