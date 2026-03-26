import { SeoAuditService } from "../../services/seoAuditService";

export class SeoAuditTool {
  private readonly seoAuditService = new SeoAuditService();

  async execute(websiteId: string) {
    return this.seoAuditService.runAudit(websiteId);
  }
}
