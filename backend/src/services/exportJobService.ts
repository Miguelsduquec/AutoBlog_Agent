import { ExportService } from "../exports/exportService";
import { articlePlanRepository, draftRepository, opportunityRepository } from "../repositories/contentRepository";
import { exportJobRepository } from "../repositories/operationsRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { ExportGenerationResult, ExportJob, ExportJobDetail } from "../types";
import { createId } from "../utils/ids";
import { HttpError } from "../utils/errors";

export class ExportJobService {
  private readonly exportService = new ExportService();

  listExports(userId: string, websiteId?: string): ExportJob[] {
    if (websiteId) {
      this.requireOwnedWebsite(userId, websiteId);
      return exportJobRepository.list(websiteId);
    }

    const websiteIds = new Set(websiteRepository.list(userId).map((website) => website.id));
    return exportJobRepository.list().filter((job) => websiteIds.has(job.websiteId));
  }

  getExport(userId: string, id: string): ExportJobDetail | null {
    const exportJob = exportJobRepository.getById(id);
    if (!exportJob || !websiteRepository.getByIdForUser(exportJob.websiteId, userId)) {
      return null;
    }

    const draft = draftRepository.getById(exportJob.draftId);
    const articlePlan = draft ? articlePlanRepository.getById(draft.articlePlanId) : null;
    const website = websiteRepository.getById(exportJob.websiteId);

    return {
      exportJob,
      files: this.exportService.listExportedFiles(exportJob.exportPath),
      draft,
      articlePlan,
      website
    };
  }

  createExport(userId: string, draftId: string, reexport = false): ExportGenerationResult {
    const draft = draftRepository.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }

    this.requireOwnedWebsite(userId, draft.websiteId);

    const articlePlan = articlePlanRepository.getById(draft.articlePlanId);
    const website = websiteRepository.getById(draft.websiteId);
    if (!articlePlan || !website) {
      throw new Error("Draft context is incomplete.");
    }

    const sourceOpportunity = articlePlan.opportunityId
      ? opportunityRepository.getById(articlePlan.opportunityId)
      : null;
    const existingJob = exportJobRepository.findByDraftId(draft.id);

    if (existingJob && !reexport) {
      return {
        exportJob: existingJob,
        exportPath: existingJob.exportPath,
        files: this.exportService.listExportedFiles(existingJob.exportPath),
        skipped: true,
        regenerated: false,
        summaryMessage: `An export package already exists for "${articlePlan.title}".`
      };
    }

    const packageResult = this.exportService.buildPackage(draft, articlePlan, website, sourceOpportunity);

    if (existingJob) {
      const updatedJob: ExportJob = {
        ...existingJob,
        exportPath: packageResult.exportPath,
        status: "exported",
        createdAt: new Date().toISOString()
      };

      const savedJob = exportJobRepository.update(updatedJob);
      return {
        exportJob: savedJob,
        exportPath: packageResult.exportPath,
        files: packageResult.files,
        skipped: false,
        regenerated: true,
        summaryMessage: `Re-exported the package for "${articlePlan.title}".`
      };
    }

    const newJob: ExportJob = {
      id: createId("export"),
      websiteId: draft.websiteId,
      draftId: draft.id,
      exportPath: packageResult.exportPath,
      status: "exported",
      createdAt: new Date().toISOString()
    };

    const savedJob = exportJobRepository.create(newJob);
    return {
      exportJob: savedJob,
      exportPath: packageResult.exportPath,
      files: packageResult.files,
      skipped: false,
      regenerated: false,
      summaryMessage: `Created an export package for "${articlePlan.title}".`
    };
  }

  private requireOwnedWebsite(userId: string, websiteId: string) {
    const website = websiteRepository.getByIdForUser(websiteId, userId);
    if (!website) {
      throw new HttpError(404, "Website not found.");
    }

    return website;
  }
}
