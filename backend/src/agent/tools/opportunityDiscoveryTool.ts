import { OpportunityService } from "../../services/opportunityService";

export class OpportunityDiscoveryTool {
  private readonly opportunityService = new OpportunityService();

  execute(websiteId: string, limit = 8) {
    return this.opportunityService.generateForWebsite(websiteId, limit);
  }
}
