import { AutomationOrchestrator, createEmptyAutomationSummary, normalizeAutomationOptions } from "../agent/core/automationOrchestrator";
import { automationRunRepository } from "../repositories/operationsRepository";
import { AutomationRun, AutomationRunRequest } from "../types";
import { createId } from "../utils/ids";

export class AutomationRunService {
  private readonly orchestrator = new AutomationOrchestrator();

  listRuns(websiteId?: string): AutomationRun[] {
    return automationRunRepository.list(websiteId);
  }

  getRun(id: string): AutomationRun | null {
    return automationRunRepository.getById(id);
  }

  async triggerRun(websiteId: string, input?: Partial<AutomationRunRequest>): Promise<AutomationRun> {
    const options = normalizeAutomationOptions(input);
    const now = new Date().toISOString();

    const run: AutomationRun = {
      id: createId("run"),
      websiteId,
      runType: options.runType,
      status: "queued",
      logsJson: [`Run queued for ${options.runType}.`],
      outputSummary: createEmptyAutomationSummary("Waiting to start"),
      createdAt: now,
      updatedAt: now
    };

    automationRunRepository.create(run);

    const runningRun: AutomationRun = {
      ...run,
      status: "running",
      logsJson: [...run.logsJson, "Automation workflow started."],
      outputSummary: createEmptyAutomationSummary(`Running ${options.runType} workflow.`),
      updatedAt: new Date().toISOString()
    };

    automationRunRepository.update(runningRun);

    try {
      const result = await this.orchestrator.run(websiteId, options);
      const completedRun: AutomationRun = {
        ...runningRun,
        status: result.status,
        logsJson: [...runningRun.logsJson, ...result.logsJson],
        outputSummary: result.outputSummary,
        updatedAt: new Date().toISOString()
      };

      automationRunRepository.update(completedRun);
      return completedRun;
    } catch (error) {
      const failedRun: AutomationRun = {
        ...runningRun,
        status: "failed",
        logsJson: [
          ...runningRun.logsJson,
          error instanceof Error ? error.message : "Unknown automation error"
        ],
        outputSummary: {
          ...runningRun.outputSummary,
          errors: [error instanceof Error ? error.message : "Unknown automation error"],
          message: "Automation run failed."
        },
        updatedAt: new Date().toISOString()
      };

      automationRunRepository.update(failedRun);
      return failedRun;
    }
  }
}
