import { Router } from "express";
import { DashboardService } from "../services/dashboardService";

const dashboardService = new DashboardService();

export const dashboardRoutes = Router();

dashboardRoutes.get("/", (_request, response) => {
  response.json(dashboardService.getSnapshot());
});
