import { AnalysisService } from "../../services/analysisService";

export class WebsiteAnalyzerTool {
  private readonly analysisService = new AnalysisService();

  async execute(websiteId: string) {
    return this.analysisService.analyzeWebsite(websiteId);
  }
}
