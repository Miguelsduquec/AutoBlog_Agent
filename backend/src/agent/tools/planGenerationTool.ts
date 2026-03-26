import { ArticlePlanService } from "../../services/articlePlanService";

export class PlanGenerationTool {
  private readonly articlePlanService = new ArticlePlanService();

  execute(websiteId: string, limit = 5) {
    return this.articlePlanService.generateForWebsite(websiteId, limit);
  }
}
