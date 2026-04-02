import { analysisRepository } from "../../repositories/analysisRepository";
import { articlePlanRepository } from "../../repositories/contentRepository";
import { websiteRepository } from "../../repositories/websiteRepository";
import { AnalysisService } from "../../services/analysisService";
import { ArticlePlanService } from "../../services/articlePlanService";
import { DraftService } from "../../services/draftService";
import { ExportJobService } from "../../services/exportJobService";
import { OpportunityService } from "../../services/opportunityService";
import { AutomationRun, AutomationRunRequest, AutomationRunSummary, ContentOpportunity } from "../../types";

type OrchestratorResult = {
  status: AutomationRun["status"];
  logsJson: string[];
  outputSummary: AutomationRunSummary;
};

type NormalizedAutomationOptions = Required<AutomationRunRequest>;

const PRIORITY_SCORE: Record<ContentOpportunity["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1
};

export function createEmptyAutomationSummary(message = ""): AutomationRunSummary {
  return {
    analysisCreated: false,
    opportunitiesCreated: 0,
    plansCreated: 0,
    draftsCreated: 0,
    exportsCreated: 0,
    skippedItems: 0,
    errors: [],
    outputIds: {
      opportunityIds: [],
      planIds: [],
      draftIds: [],
      exportJobIds: []
    },
    message
  };
}

export function normalizeAutomationOptions(input?: Partial<AutomationRunRequest>): NormalizedAutomationOptions {
  const runType = input?.runType ?? "full-pipeline";
  const maxOpportunities = Number.isFinite(input?.maxOpportunities)
    ? Math.max(1, Math.min(10, Number(input?.maxOpportunities)))
    : 5;

  return {
    runType,
    maxOpportunities,
    generateDrafts: input?.generateDrafts ?? true,
    exportDrafts: input?.exportDrafts ?? false
  };
}

function buildSummaryMessage(summary: AutomationRunSummary, runType: AutomationRun["runType"]): string {
  const describeCount = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

  const parts = [
    summary.analysisCreated ? "analysis refreshed" : "",
    summary.opportunitiesCreated > 0
      ? `${describeCount(summary.opportunitiesCreated, "opportunity", "opportunities")} created`
      : "",
    summary.plansCreated > 0 ? `${describeCount(summary.plansCreated, "plan", "plans")} created` : "",
    summary.draftsCreated > 0 ? `${describeCount(summary.draftsCreated, "draft", "drafts")} created` : "",
    summary.exportsCreated > 0 ? `${describeCount(summary.exportsCreated, "export", "exports")} created` : "",
    summary.skippedItems > 0 ? `${describeCount(summary.skippedItems, "item", "items")} skipped` : ""
  ].filter(Boolean);

  if (parts.length === 0) {
    if (runType === "analyze-only") {
      return "Analysis completed.";
    }

    return "Workflow completed with no new items created.";
  }

  return parts.join(", ");
}

function addUnique(values: string[], nextValue: string): void {
  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function sortPipelineCandidates(opportunities: ContentOpportunity[]): ContentOpportunity[] {
  return [...opportunities].sort((left, right) => {
    const priorityDelta = PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export class AutomationOrchestrator {
  private readonly analysisService = new AnalysisService();

  private readonly opportunityService = new OpportunityService();

  private readonly articlePlanService = new ArticlePlanService();

  private readonly draftService = new DraftService();

  private readonly exportJobService = new ExportJobService();

  async run(userId: string, websiteId: string, input?: Partial<AutomationRunRequest>): Promise<OrchestratorResult> {
    const options = normalizeAutomationOptions(input);
    const logsJson: string[] = [];
    const outputSummary = createEmptyAutomationSummary();

    const log = (message: string) => {
      logsJson.push(message);
    };

    const recordError = (context: string, error: unknown) => {
      const detail = error instanceof Error ? error.message : "Unknown automation error";
      const message = `${context}: ${detail}`;
      outputSummary.errors.push(message);
      log(message);
    };

    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new Error("Website not found.");
    }

    log(`Loaded website "${website.name}" for a ${options.runType} automation run.`);

    let latestAnalysis = analysisRepository.getLatestByWebsiteId(websiteId);

    try {
      if (options.runType === "analyze-only" || !latestAnalysis) {
        const analysisResult = await this.analysisService.analyzeWebsite(websiteId);
        latestAnalysis = analysisResult.analysis;
        outputSummary.analysisCreated = true;
        log(
          `Website analysis completed with ${analysisResult.pages.length} analyzed page${analysisResult.pages.length === 1 ? "" : "s"}.`
        );
      } else {
        log(`Reused existing analysis from ${latestAnalysis.createdAt}.`);
      }

      if (options.runType === "analyze-only") {
        outputSummary.message = buildSummaryMessage(outputSummary, options.runType);
        return {
          status: "completed",
          logsJson,
          outputSummary
        };
      }
    } catch (error) {
      recordError("Analysis step failed", error);
      outputSummary.message = "Automation stopped during website analysis.";
      return {
        status: "failed",
        logsJson,
        outputSummary
      };
    }

    const plannedOpportunityIds = new Set(
      articlePlanRepository
        .list(websiteId)
        .map((plan) => plan.opportunityId)
        .filter((value): value is string => Boolean(value))
    );

    let candidateOpportunities = this.opportunityService
      .listOpportunities(userId, websiteId)
      .filter((opportunity) => !plannedOpportunityIds.has(opportunity.id) && opportunity.status !== "failed");

    if (candidateOpportunities.length < options.maxOpportunities) {
      try {
        const generationResult = this.opportunityService.generateFromLatestAnalysis(
          userId,
          websiteId,
          Math.max(options.maxOpportunities * 2, 10)
        );
        outputSummary.opportunitiesCreated += generationResult.createdOpportunities.length;
        outputSummary.skippedItems += generationResult.skippedDuplicatesCount;
        generationResult.createdOpportunities.forEach((opportunity) =>
          addUnique(outputSummary.outputIds.opportunityIds, opportunity.id)
        );
        log(generationResult.summaryMessage);
      } catch (error) {
        recordError("Opportunity generation failed", error);
      }

      candidateOpportunities = this.opportunityService
        .listOpportunities(userId, websiteId)
        .filter((opportunity) => !plannedOpportunityIds.has(opportunity.id) && opportunity.status !== "failed");
    } else {
      log(`Found ${candidateOpportunities.length} unplanned opportunities already available.`);
    }

    if (options.runType === "opportunities-only") {
      outputSummary.message = buildSummaryMessage(outputSummary, options.runType);
      return {
        status: outputSummary.errors.length > 0 ? "partial" : "completed",
        logsJson,
        outputSummary
      };
    }

    const selectedOpportunities = sortPipelineCandidates(candidateOpportunities).slice(0, options.maxOpportunities);
    if (selectedOpportunities.length === 0) {
      log("No eligible opportunities were available for plan generation.");
      outputSummary.message = buildSummaryMessage(outputSummary, options.runType);
      return {
        status: outputSummary.errors.length > 0 ? "partial" : "completed",
        logsJson,
        outputSummary
      };
    }

    log(`Selected ${selectedOpportunities.length} opportunity candidates for the pipeline.`);

    const pipelinePlanIds: string[] = [];

    for (const opportunity of selectedOpportunities) {
      addUnique(outputSummary.outputIds.opportunityIds, opportunity.id);

      try {
        const result = this.articlePlanService.generateFromOpportunity(userId, opportunity.id);
        addUnique(outputSummary.outputIds.planIds, result.plan.id);
        addUnique(pipelinePlanIds, result.plan.id);

        if (result.skipped) {
          outputSummary.skippedItems += 1;
        } else {
          outputSummary.plansCreated += 1;
        }

        log(result.summaryMessage);
      } catch (error) {
        recordError(`Plan generation failed for "${opportunity.keyword}"`, error);
      }
    }

    if (!options.generateDrafts) {
      if (options.exportDrafts) {
        log("Export step skipped because draft generation was disabled for this run.");
      }

      outputSummary.message = buildSummaryMessage(outputSummary, options.runType);
      return {
        status: outputSummary.errors.length > 0 ? "partial" : "completed",
        logsJson,
        outputSummary
      };
    }

    const pipelineDraftIds: string[] = [];

    for (const planId of pipelinePlanIds) {
      const plan = articlePlanRepository.getById(planId);
      if (!plan) {
        outputSummary.skippedItems += 1;
        log(`Skipped missing plan ${planId} during draft generation.`);
        continue;
      }

      try {
        const result = this.draftService.generateFromArticlePlan(userId, plan.id);
        addUnique(outputSummary.outputIds.draftIds, result.draft.id);
        addUnique(pipelineDraftIds, result.draft.id);

        if (result.skipped) {
          outputSummary.skippedItems += 1;
        } else {
          outputSummary.draftsCreated += 1;
        }

        log(result.summaryMessage);
      } catch (error) {
        recordError(`Draft generation failed for "${plan.title}"`, error);
      }
    }

    if (options.exportDrafts) {
      for (const draftId of pipelineDraftIds) {
        try {
          const result = this.exportJobService.createExport(userId, draftId);
          addUnique(outputSummary.outputIds.exportJobIds, result.exportJob.id);

          if (result.skipped) {
            outputSummary.skippedItems += 1;
          } else {
            outputSummary.exportsCreated += 1;
          }

          log(result.summaryMessage);
        } catch (error) {
          recordError(`Export failed for draft ${draftId}`, error);
        }
      }
    } else {
      log("Export step disabled for this run.");
    }

    outputSummary.message = buildSummaryMessage(outputSummary, options.runType);

    const hasProgress =
      outputSummary.analysisCreated ||
      outputSummary.opportunitiesCreated > 0 ||
      outputSummary.plansCreated > 0 ||
      outputSummary.draftsCreated > 0 ||
      outputSummary.exportsCreated > 0 ||
      outputSummary.skippedItems > 0;

    return {
      status: outputSummary.errors.length === 0 ? "completed" : hasProgress ? "partial" : "failed",
      logsJson,
      outputSummary
    };
  }
}
