import { ArticlePlannerService } from "../content/articlePlannerService";
import { analysisRepository } from "../repositories/analysisRepository";
import { articlePlanRepository, opportunityRepository } from "../repositories/contentRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { ArticlePlan, PlanGenerationResult } from "../types";

export class ArticlePlanService {
  private readonly planner = new ArticlePlannerService();

  listPlans(websiteId?: string): ArticlePlan[] {
    return articlePlanRepository.list(websiteId);
  }

  getPlan(id: string): ArticlePlan | null {
    return articlePlanRepository.getById(id);
  }

  generateForWebsite(websiteId: string, limit = 5): ArticlePlan[] {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

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

    return candidates
      .map((opportunity) => this.generateFromOpportunity(opportunity.id))
      .filter((result) => !result.skipped)
      .map((result) => result.plan);
  }

  generateFromOpportunity(opportunityId: string, regenerate = false): PlanGenerationResult {
    const opportunity = opportunityRepository.getById(opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const website = websiteRepository.getById(opportunity.websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

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

  createPlan(plan: ArticlePlan): ArticlePlan {
    return articlePlanRepository.create(plan);
  }
}
