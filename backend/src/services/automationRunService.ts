import { AutomationOrchestrator, createEmptyAutomationSummary, normalizeAutomationOptions } from "../agent/core/automationOrchestrator";
import { automationRunRepository } from "../repositories/operationsRepository";
import { AutomationRun, AutomationRunRequest } from "../types";
import { createId } from "../utils/ids";
import { websiteRepository } from "../repositories/websiteRepository";
import { HttpError } from "../utils/errors";

export class AutomationRunService {
  private readonly orchestrator = new AutomationOrchestrator();

  listRuns(userId: string, websiteId?: string): AutomationRun[] {
    if (websiteId) {
      this.requireOwnedWebsite(userId, websiteId);
      return automationRunRepository.list(websiteId);
    }

    const websiteIds = new Set(websiteRepository.list(userId).map((website) => website.id));
    return automationRunRepository.list().filter((run) => websiteIds.has(run.websiteId));
  }

  getRun(userId: string, id: string): AutomationRun | null {
    const run = automationRunRepository.getById(id);
    if (!run || !websiteRepository.getByIdForUser(run.websiteId, userId)) {
      return null;
    }

    return run;
  }

  async triggerRun(userId: string, websiteId: string, input?: Partial<AutomationRunRequest>): Promise<AutomationRun> {
    this.requireOwnedWebsite(userId, websiteId);
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
      const result = await this.orchestrator.run(userId, websiteId, options);
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

  private requireOwnedWebsite(userId: string, websiteId: string) {
    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    return website;
  }
}
