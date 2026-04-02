import { OpportunityDiscoveryTool } from "../tools/opportunityDiscoveryTool";
import { PlanGenerationTool } from "../tools/planGenerationTool";
import { SeoAuditTool } from "../tools/seoAuditTool";
import { WebsiteAnalyzerTool } from "../tools/websiteAnalyzerTool";

export class WorkflowAgent {
  private readonly websiteAnalyzer = new WebsiteAnalyzerTool();

  private readonly seoAuditTool = new SeoAuditTool();

  private readonly opportunityTool = new OpportunityDiscoveryTool();

  private readonly planTool = new PlanGenerationTool();

  async analyzeWebsite(websiteId: string) {
    return this.websiteAnalyzer.execute(websiteId);
  }

  async runSeoAudit(websiteId: string) {
    return this.seoAuditTool.execute(websiteId);
  }

  async findArticleOpportunities(userId: string, websiteId: string, limit = 8) {
    return this.opportunityTool.execute(userId, websiteId, limit);
  }

  async generateArticlePlans(userId: string, websiteId: string, limit = 5) {
    return this.planTool.execute(userId, websiteId, limit);
  }
}
