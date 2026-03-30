import { analysisRepository } from "../repositories/analysisRepository";
import { opportunityRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { DashboardSnapshot } from "../types";

export class DashboardService {
  getSnapshot(): DashboardSnapshot {
    return {
      totals: {
        websites: websiteRepository.count(),
        analysisRuns: analysisRepository.count(),
        analyzedPages: websitePageRepository.count(),
        opportunities: opportunityRepository.count()
      },
      recentAnalysisRuns: analysisRepository.listRecent(5),
      topOpportunities: opportunityRepository.top(5)
    };
  }
}
