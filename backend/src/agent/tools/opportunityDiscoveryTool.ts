import { OpportunityService } from "../../services/opportunityService";

export class OpportunityDiscoveryTool {
  private readonly opportunityService = new OpportunityService();

  execute(userId: string, websiteId: string, limit = 8) {
    return this.opportunityService.generateFromLatestAnalysis(userId, websiteId, limit).createdOpportunities;
  }
}
