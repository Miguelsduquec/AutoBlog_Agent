import { WorkflowPlanner } from "../planners/workflowPlanner";
import { DraftGenerationTool } from "../tools/draftGenerationTool";
import { OpportunityDiscoveryTool } from "../tools/opportunityDiscoveryTool";
import { PlanGenerationTool } from "../tools/planGenerationTool";
import { SeoAuditTool } from "../tools/seoAuditTool";
import { WebsiteAnalyzerTool } from "../tools/websiteAnalyzerTool";

export class WorkflowAgent {
  private readonly planner = new WorkflowPlanner();

  private readonly websiteAnalyzer = new WebsiteAnalyzerTool();

  private readonly seoAuditTool = new SeoAuditTool();

  private readonly opportunityTool = new OpportunityDiscoveryTool();

  private readonly planTool = new PlanGenerationTool();

  private readonly draftTool = new DraftGenerationTool();

  async analyzeWebsite(websiteId: string) {
    return this.websiteAnalyzer.execute(websiteId);
  }

  async runSeoAudit(websiteId: string) {
    return this.seoAuditTool.execute(websiteId);
  }

  async findArticleOpportunities(websiteId: string, limit = 8) {
    return this.opportunityTool.execute(websiteId, limit);
  }

  async generateArticlePlans(websiteId: string, limit = 5) {
    return this.planTool.execute(websiteId, limit);
  }

  async generateAutomaticDrafts(websiteId: string, targetDraftCount: number) {
    const steps = this.planner.buildAutomaticDraftPlan(targetDraftCount);
    const logs = steps.map((step) => `Planned step: ${step}`);

    const analysis = await this.websiteAnalyzer.execute(websiteId);
    logs.push(`Analyzed ${analysis.pages.length} pages.`);

    const audit = await this.seoAuditTool.execute(websiteId);
    logs.push(`SEO audit completed with score ${audit.score}.`);

    const opportunities = this.opportunityTool.execute(websiteId, Math.max(targetDraftCount * 2, 4));
    logs.push(`Generated ${opportunities.length} opportunities.`);

    const plans = this.planTool.execute(websiteId, targetDraftCount);
    logs.push(`Generated ${plans.length} article plans.`);

    const drafts = this.draftTool.execute(websiteId, targetDraftCount);
    logs.push(`Generated ${drafts.length} drafts.`);

    return {
      summary: `${opportunities.length} opportunities, ${plans.length} plans, ${drafts.length} drafts`,
      logs
    };
  }
}
