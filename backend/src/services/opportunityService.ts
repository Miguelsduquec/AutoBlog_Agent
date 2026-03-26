import { analysisRepository, seoAuditRepository } from "../repositories/analysisRepository";
import { opportunityRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { ContentOpportunity } from "../types";
import { createId } from "../utils/ids";
import { TopicDiscoveryService } from "../content/topicDiscoveryService";

type OpportunityInput = Pick<
  ContentOpportunity,
  "websiteId" | "keyword" | "cluster" | "intent" | "relevanceScore" | "estimatedDifficulty" | "priority" | "source" | "status"
>;

export class OpportunityService {
  private readonly topicDiscovery = new TopicDiscoveryService();

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

  generateForWebsite(websiteId: string, limit = 8): ContentOpportunity[] {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const analysis = analysisRepository.getLatestByWebsiteId(websiteId);
    const audit = seoAuditRepository.getLatestByWebsiteId(websiteId);
    const pages = websitePageRepository.listByWebsiteId(websiteId);
    const existing = opportunityRepository.list(websiteId);
    const generated = this.topicDiscovery.discoverOpportunities(website, analysis, audit, pages, existing, limit);

    return opportunityRepository.createMany(generated);
  }
}
