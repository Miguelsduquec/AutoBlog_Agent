import { analysisRepository, seoAuditRepository } from "../repositories/analysisRepository";
import { draftRepository, opportunityRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { Website, WebsiteDetail } from "../types";
import { createId } from "../utils/ids";
import { HttpError } from "../utils/errors";
import { normalizeHttpUrl } from "../utils/url";

type WebsiteInput = Pick<
  Website,
  "name" | "domain" | "language" | "targetCountry" | "niche" | "tone" | "contentGoal" | "publishingFrequency"
>;

function normalizeWebsiteInput(input: WebsiteInput): WebsiteInput {
  const name = input.name.trim();
  if (!name) {
    throw new HttpError(400, "Website name is required.");
  }

  return {
    ...input,
    name,
    domain: normalizeHttpUrl(input.domain),
    language: input.language.trim() || "English",
    targetCountry: input.targetCountry.trim() || "Global",
    niche: input.niche.trim(),
    tone: input.tone.trim(),
    contentGoal: input.contentGoal.trim(),
    publishingFrequency: input.publishingFrequency.trim() || "Weekly"
  };
}

export class WebsiteService {
  listWebsites(userId: string): Website[] {
    return websiteRepository.list(userId);
  }

  getWebsiteDetail(userId: string, id: string): WebsiteDetail | null {
    const website = websiteRepository.getByIdForUser(id, userId);
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

  createWebsite(userId: string, input: WebsiteInput): Website {
    const now = new Date().toISOString();
    const normalizedInput = normalizeWebsiteInput(input);
    const website: Website = {
      id: createId("site"),
      userId,
      ...normalizedInput,
      createdAt: now,
      updatedAt: now
    };

    return websiteRepository.create(website);
  }

  updateWebsite(userId: string, id: string, input: WebsiteInput): Website | null {
    const existing = websiteRepository.getByIdForUser(id, userId);
    if (!existing) {
      return null;
    }

    const normalizedInput = normalizeWebsiteInput(input);

    const updated: Website = {
      ...existing,
      ...normalizedInput,
      updatedAt: new Date().toISOString()
    };

    return websiteRepository.update(updated);
  }

  deleteWebsite(userId: string, id: string): void {
    const website = websiteRepository.getByIdForUser(id, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    websiteRepository.delete(id);
  }

  requireOwnedWebsite(userId: string, websiteId: string): Website {
    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    return website;
  }
}
