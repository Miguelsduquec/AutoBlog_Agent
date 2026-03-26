import { analysisRepository, seoAuditRepository } from "../repositories/analysisRepository";
import { draftRepository, opportunityRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { Website, WebsiteDetail } from "../types";
import { createId } from "../utils/ids";

type WebsiteInput = Pick<
  Website,
  "name" | "domain" | "language" | "targetCountry" | "niche" | "tone" | "contentGoal" | "publishingFrequency"
>;

export class WebsiteService {
  listWebsites(): Website[] {
    return websiteRepository.list();
  }

  getWebsiteDetail(id: string): WebsiteDetail | null {
    const website = websiteRepository.getById(id);
    if (!website) {
      return null;
    }

    return {
      website,
      pages: websitePageRepository.listByWebsiteId(id),
      latestAnalysis: analysisRepository.getLatestByWebsiteId(id),
      latestAudit: seoAuditRepository.getLatestByWebsiteId(id),
      latestOpportunities: opportunityRepository.list(id).slice(0, 5),
      latestDrafts: draftRepository.list(id).slice(0, 5)
    };
  }

  createWebsite(input: WebsiteInput): Website {
    const now = new Date().toISOString();
    const website: Website = {
      id: createId("site"),
      ...input,
      createdAt: now,
      updatedAt: now
    };

    return websiteRepository.create(website);
  }

  updateWebsite(id: string, input: WebsiteInput): Website | null {
    const existing = websiteRepository.getById(id);
    if (!existing) {
      return null;
    }

    const updated: Website = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    return websiteRepository.update(updated);
  }

  deleteWebsite(id: string): void {
    websiteRepository.delete(id);
  }
}
