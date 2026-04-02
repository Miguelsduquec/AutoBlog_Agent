import { opportunityRepository } from "../repositories/contentRepository";
import { ContentOpportunity, OpportunityGenerationResult } from "../types";
import { createId } from "../utils/ids";
import { OpportunityGeneratorService } from "./opportunityGeneratorService";
import { websiteRepository } from "../repositories/websiteRepository";
import { HttpError } from "../utils/errors";

type OpportunityInput = Pick<
  ContentOpportunity,
  "websiteId" | "keyword" | "topic" | "cluster" | "intent" | "relevanceScore" | "estimatedDifficulty" | "priority" | "source" | "status"
>;

export class OpportunityService {
  private readonly generator = new OpportunityGeneratorService();

  listOpportunities(userId: string, websiteId?: string): ContentOpportunity[] {
    if (websiteId) {
      this.requireOwnedWebsite(userId, websiteId);
      return opportunityRepository.list(websiteId);
    }

    const websiteIds = new Set(websiteRepository.list(userId).map((website) => website.id));
    return opportunityRepository.list().filter((opportunity) => websiteIds.has(opportunity.websiteId));
  }

  createOpportunity(userId: string, input: OpportunityInput): ContentOpportunity {
    this.requireOwnedWebsite(userId, input.websiteId);

    const opportunity: ContentOpportunity = {
      id: createId("opp"),
      ...input,
      createdAt: new Date().toISOString()
    };

    return opportunityRepository.create(opportunity);
  }

  updateOpportunity(userId: string, id: string, input: Omit<ContentOpportunity, "id" | "createdAt">): ContentOpportunity | null {
    const existing = opportunityRepository.getById(id);
    if (!existing || !websiteRepository.getByIdForUser(existing.websiteId, userId)) {
      return null;
    }

    const updated: ContentOpportunity = {
      ...existing,
      ...input
    };

    return opportunityRepository.update(updated);
  }

  deleteOpportunity(userId: string, id: string): boolean {
    const existing = opportunityRepository.getById(id);
    if (!existing || !websiteRepository.getByIdForUser(existing.websiteId, userId)) {
      return false;
    }

    opportunityRepository.delete(id);
    return true;
  }

  generateFromLatestAnalysis(userId: string, websiteId: string, limit = 10): OpportunityGenerationResult {
    this.requireOwnedWebsite(userId, websiteId);
    return this.generator.generateForWebsite(websiteId, limit);
  }

  private requireOwnedWebsite(userId: string, websiteId: string) {
    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    return website;
  }
}
