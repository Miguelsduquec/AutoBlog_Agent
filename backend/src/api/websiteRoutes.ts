import { Router } from "express";
import { WorkflowAgent } from "../agent/core/workflowAgent";
import { AnalysisService } from "../services/analysisService";
import { ArticlePlanService } from "../services/articlePlanService";
import { AutomationService } from "../services/automationService";
import { DraftService } from "../services/draftService";
import { OpportunityService } from "../services/opportunityService";
import { SeoAuditService } from "../services/seoAuditService";
import { WebsiteService } from "../services/websiteService";
import { asyncHandler } from "./utils";

const router = Router();
const websiteService = new WebsiteService();
const analysisService = new AnalysisService();
const seoAuditService = new SeoAuditService();
const opportunityService = new OpportunityService();
const articlePlanService = new ArticlePlanService();
const draftService = new DraftService();
const automationService = new AutomationService();
const workflowAgent = new WorkflowAgent();

router.get("/", (_request, response) => {
  response.json(websiteService.listWebsites());
});

router.post("/", (request, response) => {
  const website = websiteService.createWebsite(request.body);
  response.status(201).json(website);
});

router.get("/:id", (request, response) => {
  const websiteId = String(request.params.id);
  const detail = websiteService.getWebsiteDetail(websiteId);
  if (!detail) {
    response.status(404).json({ message: "Website not found." });
    return;
  }

  response.json(detail);
});

router.put("/:id", (request, response) => {
  const website = websiteService.updateWebsite(String(request.params.id), request.body);
  if (!website) {
    response.status(404).json({ message: "Website not found." });
    return;
  }

  response.json(website);
});

router.delete("/:id", (request, response) => {
  websiteService.deleteWebsite(String(request.params.id));
  response.status(204).send();
});

router.post(
  "/:id/analyze",
  asyncHandler(async (request, response) => {
    response.json(await workflowAgent.analyzeWebsite(String(request.params.id)));
  })
);

router.get("/:id/analysis", (request, response) => {
  response.json(analysisService.getAnalysisHistory(String(request.params.id)));
});

router.post(
  "/:id/audit",
  asyncHandler(async (request, response) => {
    response.json(await seoAuditService.runAudit(String(request.params.id)));
  })
);

router.get("/:id/audits", (request, response) => {
  response.json(seoAuditService.listAudits(String(request.params.id)));
});

router.get("/:id/opportunities", (request, response) => {
  response.json(opportunityService.listOpportunities(String(request.params.id)));
});

router.post("/:id/opportunities/generate", (request, response) => {
  response.json(opportunityService.generateForWebsite(String(request.params.id), Number(request.body?.limit ?? 8)));
});

router.post("/:id/plans/generate", (request, response) => {
  response.json(articlePlanService.generateForWebsite(String(request.params.id), Number(request.body?.limit ?? 5)));
});

router.post("/:id/drafts/generate", (request, response) => {
  response.json(draftService.generateDraftsForWebsite(String(request.params.id), Number(request.body?.limit ?? 3)));
});

router.post(
  "/:id/automation-runs/trigger",
  asyncHandler(async (request, response) => {
    const run = await automationService.triggerRun(
      String(request.params.id),
      request.body?.runType ?? "manual-generation-run",
      Number(request.body?.targetDraftCount ?? 2)
    );
    response.status(201).json(run);
  })
);

export const websiteRoutes = router;
