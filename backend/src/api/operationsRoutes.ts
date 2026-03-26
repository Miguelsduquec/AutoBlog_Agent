import { Router } from "express";
import { AutomationService } from "../services/automationService";

const router = Router();
const automationService = new AutomationService();

router.get("/automation-runs", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(automationService.listRuns(websiteId));
});

export const operationsRoutes = router;
