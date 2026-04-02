import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { billingRoutes } from "./billingRoutes";
import { contentRoutes } from "./contentRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { operationsRoutes } from "./operationsRoutes";
import { toolRoutes } from "./toolRoutes";
import { requireActiveSubscription } from "./utils";
import { websiteRoutes } from "./websiteRoutes";

export const apiRouter = Router();

apiRouter.use("/", authRoutes);
apiRouter.use("/", billingRoutes);
apiRouter.use("/tools", toolRoutes);
apiRouter.use("/dashboard", requireActiveSubscription, dashboardRoutes);
apiRouter.use("/websites", requireActiveSubscription, websiteRoutes);
apiRouter.use("/", requireActiveSubscription, contentRoutes);
apiRouter.use("/", requireActiveSubscription, operationsRoutes);
