import { ArticlePlannerService } from "../content/articlePlannerService";
import { articlePlanRepository, opportunityRepository } from "../repositories/contentRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { ArticlePlan } from "../types";

export class ArticlePlanService {
  private readonly planner = new ArticlePlannerService();

  listPlans(websiteId?: string): ArticlePlan[] {
    return articlePlanRepository.list(websiteId);
  }

  generateForWebsite(websiteId: string, limit = 5): ArticlePlan[] {
    const website = websiteRepository.getById(websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const candidates = opportunityRepository
      .list(websiteId)
      .filter((opportunity) => opportunity.status === "new")
      .slice(0, limit);

    const plans = candidates.map((opportunity) => {
      const plan = this.planner.createPlan(website, opportunity);
      opportunityRepository.update({
        ...opportunity,
        status: "planned"
      });
      return plan;
    });

    return articlePlanRepository.createMany(plans);
  }

  generateFromOpportunity(opportunityId: string): ArticlePlan {
    const opportunity = opportunityRepository.getById(opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const website = websiteRepository.getById(opportunity.websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const plan = this.planner.createPlan(website, opportunity);
    opportunityRepository.update({
      ...opportunity,
      status: "planned"
    });

    return articlePlanRepository.create(plan);
  }

  createPlan(plan: ArticlePlan): ArticlePlan {
    return articlePlanRepository.create(plan);
  }
}
