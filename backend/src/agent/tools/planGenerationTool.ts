import { ArticlePlanService } from "../../services/articlePlanService";

export class PlanGenerationTool {
  private readonly articlePlanService = new ArticlePlanService();

  execute(userId: string, websiteId: string, limit = 5) {
    return this.articlePlanService.generateForWebsite(userId, websiteId, limit);
  }
}
