import cors from "cors";
import express from "express";
import path from "node:path";
import { apiRouter } from "./api/router";
import { config } from "./config";
import { seedDatabase } from "./db/seed";
import { websiteRepository } from "./repositories/websiteRepository";
import { isHttpError } from "./utils/errors";

type CreateAppOptions = {
  seed?: boolean;
};

export function createApp(options: CreateAppOptions = {}) {
  if (options.seed === true) {
    seedDatabase(false);
  }

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/exports", express.static(config.exportsDir));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      seeded: websiteRepository.count() > 0
    });
  });

  app.use("/api", apiRouter);

  app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const statusCode = isHttpError(error) ? error.statusCode : 500;
    response.status(statusCode).json({
      message: error.message || "Unexpected server error"
    });
  });

  app.get("*", (_request, response) => {
    response.sendFile(path.resolve(config.repoRoot, "frontend", "index.html"));
  });

  return app;
}
