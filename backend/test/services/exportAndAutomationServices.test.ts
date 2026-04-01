import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "../../src/config";
import { exportJobRepository } from "../../src/repositories/operationsRepository";
import { AutomationRunService } from "../../src/services/automationRunService";
import { ExportJobService } from "../../src/services/exportJobService";

describe("Export and automation services", () => {
  it("exports a deterministic article package and skips duplicate exports", () => {
    const service = new ExportJobService();

    const firstRun = service.createExport("draft-polped-1");
    const secondRun = service.createExport("draft-polped-1");

    expect(firstRun.skipped).toBe(false);
    expect(firstRun.files).toEqual(["article.md", "content.html", "metadata.json", "seo.json", "brief.json"]);
    expect(fs.existsSync(path.join(firstRun.exportPath, "article.md"))).toBe(true);
    expect(fs.existsSync(path.join(firstRun.exportPath, "seo.json"))).toBe(true);
    expect(secondRun.skipped).toBe(true);
    expect(exportJobRepository.findByDraftId("draft-polped-1")?.id).toBe(firstRun.exportJob.id);
  });

  it("runs the full automation workflow and records logs plus summary counts", async () => {
    const service = new AutomationRunService();

    const run = await service.triggerRun("site-greenforge", {
      runType: "full-pipeline",
      maxOpportunities: 1,
      generateDrafts: true,
      exportDrafts: true
    });

    expect(run.status === "completed" || run.status === "partial").toBe(true);
    expect(run.logsJson.length).toBeGreaterThan(2);
    expect(run.outputSummary.plansCreated).toBeGreaterThanOrEqual(1);
    expect(run.outputSummary.draftsCreated).toBeGreaterThanOrEqual(1);
    expect(run.outputSummary.exportsCreated).toBeGreaterThanOrEqual(1);
    expect(run.outputSummary.outputIds.planIds.length).toBeGreaterThanOrEqual(1);
    expect(run.outputSummary.message.length).toBeGreaterThan(0);
    expect(run.updatedAt.length).toBeGreaterThan(0);
    expect(fs.existsSync(config.exportsDir)).toBe(true);
  });
});
