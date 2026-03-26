import { analysisRepository } from "../repositories/analysisRepository";
import { draftRepository, opportunityRepository } from "../repositories/contentRepository";
import { automationRunRepository } from "../repositories/operationsRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { DashboardSnapshot } from "../types";

export class DashboardService {
  getSnapshot(): DashboardSnapshot {
    return {
      totals: {
        websites: websiteRepository.count(),
        analysisRuns: analysisRepository.count(),
        drafts: draftRepository.count(),
        pendingReview: draftRepository.countPendingReview(),
        automationRuns: automationRunRepository.count()
      },
      recentAnalysisRuns: analysisRepository.listRecent(5),
      latestAutomationRuns: automationRunRepository.latest(5),
      topOpportunities: opportunityRepository.top(5)
    };
  }
}
