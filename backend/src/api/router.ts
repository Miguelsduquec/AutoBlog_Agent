import { Router } from "express";
import { contentRoutes } from "./contentRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { operationsRoutes } from "./operationsRoutes";
import { toolRoutes } from "./toolRoutes";
import { websiteRoutes } from "./websiteRoutes";

export const apiRouter = Router();

apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/tools", toolRoutes);
apiRouter.use("/websites", websiteRoutes);
apiRouter.use("/", contentRoutes);
apiRouter.use("/", operationsRoutes);
