import { Router } from "express";
import { AutomationService } from "../services/automationService";

const router = Router();
const automationService = new AutomationService();

router.get("/automation-runs", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(automationService.listRuns(websiteId));
});

router.get("/automation-runs/:id", (request, response) => {
  const run = automationService.getRun(String(request.params.id));
  if (!run) {
    response.status(404).json({ message: "Automation run not found." });
    return;
  }

  response.json(run);
});

export const operationsRoutes = router;
