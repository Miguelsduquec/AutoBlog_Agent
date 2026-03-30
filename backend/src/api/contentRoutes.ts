import { Router } from "express";
import { ArticlePlanService } from "../services/articlePlanService";
import { DraftService } from "../services/draftService";
import { ExportJobService } from "../services/exportJobService";
import { OpportunityService } from "../services/opportunityService";

const router = Router();
const opportunityService = new OpportunityService();
const articlePlanService = new ArticlePlanService();
const draftService = new DraftService();
const exportJobService = new ExportJobService();

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

router.delete("/opportunities/:id", (request, response) => {
  const deleted = opportunityService.deleteOpportunity(String(request.params.id));
  if (!deleted) {
    response.status(404).json({ message: "Opportunity not found." });
    return;
  }

  response.status(204).send();
});

router.get("/plans", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(articlePlanService.listPlans(websiteId));
});

router.get("/article-plans", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(articlePlanService.listPlans(websiteId));
});

router.get("/article-plans/:id", (request, response) => {
  const plan = articlePlanService.getPlan(String(request.params.id));
  if (!plan) {
    response.status(404).json({ message: "Article plan not found." });
    return;
  }

  response.json(plan);
});

router.post("/opportunities/:id/generate-plan", (request, response) => {
  const result = articlePlanService.generateFromOpportunity(
    String(request.params.id),
    Boolean(request.body?.regenerate)
  );
  response.status(result.skipped || result.regenerated ? 200 : 201).json(result);
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

router.post("/article-plans/:id/generate-draft", (request, response) => {
  const result = draftService.generateFromArticlePlan(
    String(request.params.id),
    Boolean(request.body?.regenerate)
  );
  response.status(result.skipped || result.regenerated ? 200 : 201).json(result);
});

router.post("/plans/:id/drafts", (request, response) => {
  const result = draftService.generateFromArticlePlan(
    String(request.params.id),
    Boolean(request.body?.regenerate)
  );
  response.status(result.skipped || result.regenerated ? 200 : 201).json(result);
});

router.post("/drafts/:id/regenerate", (request, response) => {
  response.json(draftService.regenerateSection(String(request.params.id), request.body.section));
});

router.post("/drafts/:id/mark-ready", (request, response) => {
  response.json(draftService.markReviewReady(String(request.params.id)));
});

router.get("/exports", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(exportJobService.listExports(websiteId));
});

router.get("/exports/:id", (request, response) => {
  const detail = exportJobService.getExport(String(request.params.id));
  if (!detail) {
    response.status(404).json({ message: "Export job not found." });
    return;
  }

  response.json(detail);
});

router.post("/drafts/:id/export", (request, response) => {
  const result = exportJobService.createExport(String(request.params.id), Boolean(request.body?.reexport));
  response.status(result.skipped || result.regenerated ? 200 : 201).json(result);
});

export const contentRoutes = router;
