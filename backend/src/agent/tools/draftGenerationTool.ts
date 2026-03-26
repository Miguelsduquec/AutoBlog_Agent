import { DraftService } from "../../services/draftService";

export class DraftGenerationTool {
  private readonly draftService = new DraftService();

  execute(websiteId: string, limit = 3) {
    return this.draftService.generateDraftsForWebsite(websiteId, limit);
  }
}
