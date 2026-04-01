import { opportunityRepository } from "../repositories/contentRepository";
import { ContentOpportunity, OpportunityGenerationResult } from "../types";
import { createId } from "../utils/ids";
import { OpportunityGeneratorService } from "./opportunityGeneratorService";

type OpportunityInput = Pick<
  ContentOpportunity,
  "websiteId" | "keyword" | "topic" | "cluster" | "intent" | "relevanceScore" | "estimatedDifficulty" | "priority" | "source" | "status"
>;

export class OpportunityService {
  private readonly generator = new OpportunityGeneratorService();

  listOpportunities(websiteId?: string): ContentOpportunity[] {
    return opportunityRepository.list(websiteId);
  }

  createOpportunity(input: OpportunityInput): ContentOpportunity {
    const opportunity: ContentOpportunity = {
      id: createId("opp"),
      ...input,
      createdAt: new Date().toISOString()
    };

    return opportunityRepository.create(opportunity);
  }

  updateOpportunity(id: string, input: Omit<ContentOpportunity, "id" | "createdAt">): ContentOpportunity | null {
    const existing = opportunityRepository.getById(id);
    if (!existing) {
      return null;
    }

    const updated: ContentOpportunity = {
      ...existing,
      ...input
    };

    return opportunityRepository.update(updated);
  }

  deleteOpportunity(id: string): boolean {
    const existing = opportunityRepository.getById(id);
    if (!existing) {
      return false;
    }

    opportunityRepository.delete(id);
    return true;
  }

  generateFromLatestAnalysis(websiteId: string, limit = 10): OpportunityGenerationResult {
    return this.generator.generateForWebsite(websiteId, limit);
  }
}
