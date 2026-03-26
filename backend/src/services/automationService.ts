import { WorkflowAgent } from "../agent/core/workflowAgent";
import { automationRunRepository } from "../repositories/operationsRepository";
import { AutomationRun } from "../types";
import { createId } from "../utils/ids";

export class AutomationService {
  private readonly workflowAgent = new WorkflowAgent();

  listRuns(websiteId?: string): AutomationRun[] {
    return automationRunRepository.list(websiteId);
  }

  async triggerRun(websiteId: string, runType: string, targetDraftCount = 2): Promise<AutomationRun> {
    const run: AutomationRun = {
      id: createId("run"),
      websiteId,
      runType,
      status: "queued",
      logsJson: ["Run queued for execution."],
      outputSummary: "Waiting to start",
      createdAt: new Date().toISOString()
    };

    automationRunRepository.create(run);

    run.status = "running";
    run.logsJson.push("Agent workflow started.");
    run.outputSummary = "Executing workflow";
    automationRunRepository.update(run);

    try {
      const result = await this.workflowAgent.generateAutomaticDrafts(websiteId, targetDraftCount);
      run.status = "completed";
      run.logsJson = [...run.logsJson, ...result.logs];
      run.outputSummary = result.summary;
      automationRunRepository.update(run);
      return run;
    } catch (error) {
      run.status = "failed";
      run.logsJson.push(error instanceof Error ? error.message : "Unknown automation error");
      run.outputSummary = "Run failed";
      automationRunRepository.update(run);
      return run;
    }
  }
}
