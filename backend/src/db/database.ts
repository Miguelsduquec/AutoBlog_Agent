import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";
import { schemaStatements } from "./schema";

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.exportsDir, { recursive: true });

const sqlite = new Database(config.dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

for (const statement of schemaStatements) {
  sqlite.exec(statement);
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn("website_analysis_runs", "keywords_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("website_analysis_runs", "extracted_data_json", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("content_opportunities", "topic", "TEXT NOT NULL DEFAULT ''");
ensureColumn("article_plans", "search_intent", "TEXT NOT NULL DEFAULT 'informational'");
ensureColumn("automation_runs", "updated_at", "TEXT NOT NULL DEFAULT ''");

export const db = sqlite;
