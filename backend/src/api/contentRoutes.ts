import { Router } from "express";
import { ArticlePlanService } from "../services/articlePlanService";
import { DraftService } from "../services/draftService";
import { ExportService } from "../services/exportService";
import { OpportunityService } from "../services/opportunityService";

const router = Router();
const opportunityService = new OpportunityService();
const articlePlanService = new ArticlePlanService();
const draftService = new DraftService();
const exportService = new ExportService();

router.get("/opportunities", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(opportunityService.listOpportunities(websiteId));
});

router.post("/opportunities", (request, response) => {
  response.status(201).json(opportunityService.createOpportunity(request.body));
});

router.put("/opportunities/:id", (request, response) => {
  const updated = opportunityService.updateOpportunity(String(request.params.id), request.body);
  if (!updated) {
    response.status(404).json({ message: "Opportunity not found." });
    return;
  }

  response.json(updated);
});

router.get("/plans", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(articlePlanService.listPlans(websiteId));
});

router.post("/opportunities/:id/generate-plan", (request, response) => {
  response.status(201).json(articlePlanService.generateFromOpportunity(String(request.params.id)));
});

router.get("/drafts", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(draftService.listDrafts(websiteId));
});

router.get("/drafts/:id", (request, response) => {
  const draft = draftService.getDraft(String(request.params.id));
  if (!draft) {
    response.status(404).json({ message: "Draft not found." });
    return;
  }

  response.json(draft);
});

router.post("/plans/:id/drafts", (request, response) => {
  response.status(201).json(draftService.generateDraft(String(request.params.id)));
});

router.post("/drafts/:id/regenerate", (request, response) => {
  response.json(draftService.regenerateSection(String(request.params.id), request.body.section));
});

router.post("/drafts/:id/mark-ready", (request, response) => {
  response.json(draftService.markReviewReady(String(request.params.id)));
});

router.get("/exports", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(exportService.listExports(websiteId));
});

router.post("/drafts/:id/export", (request, response) => {
  response.status(201).json(exportService.createExport(String(request.params.id)));
});

export const contentRoutes = router;
