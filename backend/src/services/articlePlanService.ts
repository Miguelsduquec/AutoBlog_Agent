import { ArticlePlannerService } from "../content/articlePlannerService";
import { analysisRepository } from "../repositories/analysisRepository";
import { articlePlanRepository, opportunityRepository } from "../repositories/contentRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { ArticlePlan, PlanGenerationResult } from "../types";
import { HttpError } from "../utils/errors";

export class ArticlePlanService {
  private readonly planner = new ArticlePlannerService();

  listPlans(userId: string, websiteId?: string): ArticlePlan[] {
    if (websiteId) {
      this.requireOwnedWebsite(userId, websiteId);
      return articlePlanRepository.list(websiteId);
    }

    const websiteIds = new Set(websiteRepository.list(userId).map((website) => website.id));
    return articlePlanRepository.list().filter((plan) => websiteIds.has(plan.websiteId));
  }

  getPlan(userId: string, id: string): ArticlePlan | null {
    const plan = articlePlanRepository.getById(id);
    if (!plan || !websiteRepository.getByIdForUser(plan.websiteId, userId)) {
      return null;
    }

    return plan;
  }

  generateForWebsite(userId: string, websiteId: string, limit = 5): ArticlePlan[] {
    this.requireOwnedWebsite(userId, websiteId);

    const plannedOpportunityIds = new Set(
      articlePlanRepository
        .list(websiteId)
        .map((plan) => plan.opportunityId)
        .filter((value): value is string => Boolean(value))
    );

    const candidates = opportunityRepository
      .list(websiteId)
      .filter((opportunity) => opportunity.status === "new" && !plannedOpportunityIds.has(opportunity.id))
      .slice(0, limit);

    const plans: ArticlePlan[] = [];

    for (const opportunity of candidates) {
      const result = this.generateFromOpportunity(userId, opportunity.id);
      if (!result.skipped) {
        plans.push(result.plan);
      }
    }

    return plans;
  }

  generateFromOpportunity(userId: string, opportunityId: string, regenerate = false): PlanGenerationResult {
    const opportunity = opportunityRepository.getById(opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const website = this.requireOwnedWebsite(userId, opportunity.websiteId);

    const latestAnalysis = analysisRepository.getLatestByWebsiteId(opportunity.websiteId);
    const existingPlan = articlePlanRepository.findByOpportunityId(opportunity.id);

    if (existingPlan && !regenerate) {
      if (opportunity.status !== "planned") {
        opportunityRepository.update({
          ...opportunity,
          status: "planned"
        });
      }

      return {
        plan: existingPlan,
        skipped: true,
        regenerated: false,
        summaryMessage: `A plan already exists for "${opportunity.keyword}".`
      };
    }

    const nextPlan = this.planner.createPlan(website, opportunity, latestAnalysis, existingPlan);
    opportunityRepository.update({
      ...opportunity,
      status: "planned"
    });

    if (existingPlan) {
      const updated = articlePlanRepository.update(nextPlan);
      return {
        plan: updated,
        skipped: false,
        regenerated: true,
        summaryMessage: `Regenerated the plan for "${opportunity.keyword}".`
      };
    }

    const created = articlePlanRepository.create(nextPlan);
    return {
      plan: created,
      skipped: false,
      regenerated: false,
      summaryMessage: `Created a new article plan for "${opportunity.keyword}".`
    };
  }

  private requireOwnedWebsite(userId: string, websiteId: string) {
    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    return website;
  }
}
