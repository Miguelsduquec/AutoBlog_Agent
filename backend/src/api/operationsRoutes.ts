import { Router } from "express";
import { AutomationRunService } from "../services/automationRunService";

const router = Router();
const automationRunService = new AutomationRunService();

router.get("/automation-runs", (request, response) => {
  const websiteId = typeof request.query.websiteId === "string" ? request.query.websiteId : undefined;
  response.json(automationRunService.listRuns(String(response.locals.currentUser.id), websiteId));
});

router.get("/automation-runs/:id", (request, response) => {
  const run = automationRunService.getRun(String(response.locals.currentUser.id), String(request.params.id));
  if (!run) {
    response.status(404).json({ message: "Automation run not found." });
    return;
  }

  response.json(run);
});

export const operationsRoutes = router;
