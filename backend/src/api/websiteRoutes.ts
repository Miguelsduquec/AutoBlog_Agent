import { Request, Response, Router } from "express";
import { WorkflowAgent } from "../agent/core/workflowAgent";
import { AnalysisService } from "../services/analysisService";
import { ArticlePlanService } from "../services/articlePlanService";
import { AutomationRunService } from "../services/automationRunService";
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
const automationRunService = new AutomationRunService();
const workflowAgent = new WorkflowAgent();

router.get("/", (_request, response) => {
  response.json(websiteService.listWebsites(String(response.locals.currentUser.id)));
});

router.post("/", (request, response) => {
  const website = websiteService.createWebsite(String(response.locals.currentUser.id), request.body);
  response.status(201).json(website);
});

router.get("/:id", (request, response) => {
  const websiteId = String(request.params.id);
  const detail = websiteService.getWebsiteDetail(String(response.locals.currentUser.id), websiteId);
  if (!detail) {
    response.status(404).json({ message: "Website not found." });
    return;
  }

  response.json(detail);
});

router.put("/:id", (request, response) => {
  const website = websiteService.updateWebsite(String(response.locals.currentUser.id), String(request.params.id), request.body);
  if (!website) {
    response.status(404).json({ message: "Website not found." });
    return;
  }

  response.json(website);
});

router.delete("/:id", (request, response) => {
  websiteService.deleteWebsite(String(response.locals.currentUser.id), String(request.params.id));
  response.status(204).send();
});

router.post(
  "/:id/analyze",
  asyncHandler(async (request, response) => {
    websiteService.requireOwnedWebsite(String(response.locals.currentUser.id), String(request.params.id));
    response.json(await workflowAgent.analyzeWebsite(String(request.params.id)));
  })
);

router.get("/:id/analysis", (request, response) => {
  websiteService.requireOwnedWebsite(String(response.locals.currentUser.id), String(request.params.id));
  response.json(analysisService.getAnalysisHistory(String(request.params.id)));
});

router.post(
  "/:id/audit",
  asyncHandler(async (request, response) => {
    websiteService.requireOwnedWebsite(String(response.locals.currentUser.id), String(request.params.id));
    response.json(await seoAuditService.runAudit(String(request.params.id)));
  })
);

router.get("/:id/audits", (request, response) => {
  websiteService.requireOwnedWebsite(String(response.locals.currentUser.id), String(request.params.id));
  response.json(seoAuditService.listAudits(String(request.params.id)));
});

router.get("/:id/opportunities", (request, response) => {
  response.json(opportunityService.listOpportunities(String(response.locals.currentUser.id), String(request.params.id)));
});

router.post("/:id/generate-opportunities", (request, response) => {
  response.json(
    opportunityService.generateFromLatestAnalysis(
      String(response.locals.currentUser.id),
      String(request.params.id),
      Number(request.body?.limit ?? 10)
    )
  );
});

router.post("/:id/plans/generate", (request, response) => {
  response.json(
    articlePlanService.generateForWebsite(
      String(response.locals.currentUser.id),
      String(request.params.id),
      Number(request.body?.limit ?? 5)
    )
  );
});

router.post("/:id/drafts/generate", (request, response) => {
  response.json(
    draftService.generateDraftsForWebsite(
      String(response.locals.currentUser.id),
      String(request.params.id),
      Number(request.body?.limit ?? 3)
    )
  );
});

async function handleAutomationRun(request: Request, response: Response) {
  const run = await automationRunService.triggerRun(String(response.locals.currentUser.id), String(request.params.id), request.body);
  response.status(201).json(run);
}

router.post(
  "/:id/run-automation",
  asyncHandler(async (request, response) => {
    await handleAutomationRun(request, response);
  })
);

export const websiteRoutes = router;
