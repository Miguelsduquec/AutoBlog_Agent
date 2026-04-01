import { generateOpportunityCandidates } from "../content/opportunityGenerationCore";
import { analysisRepository } from "../repositories/analysisRepository";
import { opportunityRepository } from "../repositories/contentRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { OpportunityGenerationResult } from "../types";
import { HttpError } from "../utils/errors";

export class OpportunityGeneratorService {
  generateForWebsite(websiteId: string, limit = 10): OpportunityGenerationResult {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const analysis = analysisRepository.getLatestByWebsiteId(websiteId);
    if (!analysis) {
      throw new Error("Website analysis is required before generating opportunities.");
    }

    if (analysis.confidenceLevel === "low") {
      throw new HttpError(
        409,
        "This analysis has low confidence. Re-run the analysis after pointing to a richer or valid website before generating opportunities."
      );
    }

    const existingKeywords = opportunityRepository.list(websiteId).map((opportunity) => opportunity.keyword);
    const { opportunities, skippedDuplicatesCount } = generateOpportunityCandidates(website, analysis, existingKeywords, limit);
    const createdOpportunities = opportunityRepository.createMany(opportunities);

    const summaryMessage =
      createdOpportunities.length > 0
        ? `Created ${createdOpportunities.length} opportunities from the latest website analysis and skipped ${skippedDuplicatesCount} duplicates.${analysis.confidenceLevel === "medium" ? " Analysis confidence is medium, so review the ideas before planning." : ""}`
        : `No new opportunities were created. Skipped ${skippedDuplicatesCount} duplicate candidates.`;

    return {
      createdOpportunities,
      skippedDuplicatesCount,
      summaryMessage
    };
  }
}
