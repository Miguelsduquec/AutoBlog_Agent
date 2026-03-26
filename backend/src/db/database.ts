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

export const db = sqlite;
