import { db } from "../db/database";
import { AutomationRun, ExportJob } from "../types";
import { mapAutomationRun, mapExportJob } from "./mappers";

export const automationRunRepository = {
  list(websiteId?: string): AutomationRun[] {
    if (websiteId) {
      const rows = db
        .prepare("SELECT * FROM automation_runs WHERE website_id = ? ORDER BY datetime(created_at) DESC")
        .all(websiteId) as Record<string, unknown>[];
      return rows.map(mapAutomationRun);
    }

    const rows = db
      .prepare("SELECT * FROM automation_runs ORDER BY datetime(created_at) DESC")
      .all() as Record<string, unknown>[];
    return rows.map(mapAutomationRun);
  },

  latest(limit = 5): AutomationRun[] {
    const rows = db
      .prepare("SELECT * FROM automation_runs ORDER BY datetime(created_at) DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(mapAutomationRun);
  },

  create(run: AutomationRun): AutomationRun {
    db.prepare(`
      INSERT INTO automation_runs (
        id, website_id, run_type, status, logs_json, output_summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(run.id, run.websiteId, run.runType, run.status, JSON.stringify(run.logsJson), run.outputSummary, run.createdAt);

    return run;
  },

  update(run: AutomationRun): AutomationRun {
    db.prepare(`
      UPDATE automation_runs
      SET run_type = ?, status = ?, logs_json = ?, output_summary = ?
      WHERE id = ?
    `).run(run.runType, run.status, JSON.stringify(run.logsJson), run.outputSummary, run.id);

    return run;
  },

  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM automation_runs").get() as { count: number };
    return row.count;
  }
};

export const exportJobRepository = {
  list(websiteId?: string): ExportJob[] {
    if (websiteId) {
      const rows = db
        .prepare("SELECT * FROM export_jobs WHERE website_id = ? ORDER BY datetime(created_at) DESC")
        .all(websiteId) as Record<string, unknown>[];
      return rows.map(mapExportJob);
    }

    const rows = db.prepare("SELECT * FROM export_jobs ORDER BY datetime(created_at) DESC").all() as Record<
      string,
      unknown
    >[];
    return rows.map(mapExportJob);
  },

  create(job: ExportJob): ExportJob {
    db.prepare(`
      INSERT INTO export_jobs (
        id, website_id, draft_id, export_path, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(job.id, job.websiteId, job.draftId, job.exportPath, job.status, job.createdAt);

    return job;
  }
};
