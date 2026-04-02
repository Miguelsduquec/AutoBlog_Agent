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

  if (columns.length === 0) {
    return;
  }

  if (!columns.some((column) => column.name === columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureIndex(statement: string): void {
  sqlite.exec(statement);
}

function ensureUniqueIndex(statement: string, label: string): void {
  try {
    sqlite.exec(statement);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown migration error";
    console.warn(`Skipped unique index ${label}: ${detail}`);
  }
}

ensureColumn("website_analysis_runs", "keywords_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("website_analysis_runs", "extracted_data_json", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("website_analysis_runs", "confidence_level", "TEXT NOT NULL DEFAULT 'low'");
ensureColumn("website_analysis_runs", "confidence_score", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("content_opportunities", "topic", "TEXT NOT NULL DEFAULT ''");
ensureColumn("article_plans", "search_intent", "TEXT NOT NULL DEFAULT 'informational'");
ensureColumn("automation_runs", "updated_at", "TEXT NOT NULL DEFAULT ''");
ensureColumn("websites", "user_id", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "stripe_customer_id", "TEXT NOT NULL DEFAULT ''");
ensureColumn("subscriptions", "stripe_checkout_session_id", "TEXT NOT NULL DEFAULT ''");
ensureColumn("subscriptions", "current_period_end", "TEXT NOT NULL DEFAULT ''");
ensureColumn("user_sessions", "last_seen_at", "TEXT NOT NULL DEFAULT ''");

ensureIndex(
  "CREATE INDEX IF NOT EXISTS idx_analysis_runs_website_created ON website_analysis_runs (website_id, created_at DESC)"
);
ensureIndex(
  "CREATE INDEX IF NOT EXISTS idx_content_opportunities_website_created ON content_opportunities (website_id, created_at DESC)"
);
ensureIndex(
  "CREATE INDEX IF NOT EXISTS idx_article_plans_website_created ON article_plans (website_id, created_at DESC)"
);
ensureIndex("CREATE INDEX IF NOT EXISTS idx_article_plans_opportunity_id ON article_plans (opportunity_id)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_drafts_website_created ON drafts (website_id, created_at DESC)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_drafts_article_plan_id ON drafts (article_plan_id)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_export_jobs_website_created ON export_jobs (website_id, created_at DESC)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_export_jobs_draft_id ON export_jobs (draft_id)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_websites_user_updated ON websites (user_id, updated_at DESC)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_created ON user_sessions (user_id, created_at DESC)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_subscriptions_user_updated ON subscriptions (user_id, updated_at DESC)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions (stripe_customer_id)");
ensureIndex("CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)");

ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_content_opportunities_website_keyword_unique ON content_opportunities (website_id, keyword COLLATE NOCASE)",
  "idx_content_opportunities_website_keyword_unique"
);
ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_article_plans_opportunity_unique ON article_plans (opportunity_id) WHERE opportunity_id IS NOT NULL",
  "idx_article_plans_opportunity_unique"
);
ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_article_plan_unique ON drafts (article_plan_id)",
  "idx_drafts_article_plan_unique"
);
ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_export_jobs_draft_unique ON export_jobs (draft_id)",
  "idx_export_jobs_draft_unique"
);
ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_customer_subscription_unique ON subscriptions (stripe_subscription_id) WHERE stripe_subscription_id <> ''",
  "idx_subscriptions_customer_subscription_unique"
);
ensureUniqueIndex(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_unique ON subscriptions (stripe_checkout_session_id) WHERE stripe_checkout_session_id <> ''",
  "idx_subscriptions_checkout_session_unique"
);

export const db = sqlite;
