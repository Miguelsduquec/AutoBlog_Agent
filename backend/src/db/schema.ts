export const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL,
      target_country TEXT NOT NULL,
      niche TEXT NOT NULL,
      tone TEXT NOT NULL,
      content_goal TEXT NOT NULL,
      publishing_frequency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS website_pages (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      h1 TEXT NOT NULL,
      headings_json TEXT NOT NULL,
      content_extract TEXT NOT NULL,
      page_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS website_analysis_runs (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      niche_summary TEXT NOT NULL,
      content_pillars_json TEXT NOT NULL,
      keywords_json TEXT NOT NULL DEFAULT '[]',
      extracted_data_json TEXT NOT NULL DEFAULT '{}',
      analyzed_page_count INTEGER NOT NULL,
      confidence_level TEXT NOT NULL DEFAULT 'low',
      confidence_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS seo_audit_runs (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      findings_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS content_opportunities (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      cluster TEXT NOT NULL,
      intent TEXT NOT NULL,
      relevance_score INTEGER NOT NULL,
      estimated_difficulty TEXT NOT NULL,
      priority TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS article_plans (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      opportunity_id TEXT,
      title TEXT NOT NULL,
      target_keyword TEXT NOT NULL,
      secondary_keywords_json TEXT NOT NULL,
      search_intent TEXT NOT NULL DEFAULT 'informational',
      intent TEXT NOT NULL DEFAULT 'informational',
      angle TEXT NOT NULL,
      cta TEXT NOT NULL,
      brief TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES content_opportunities(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      article_plan_id TEXT NOT NULL,
      outline_json TEXT NOT NULL,
      article_markdown TEXT NOT NULL,
      article_html TEXT NOT NULL,
      slug TEXT NOT NULL,
      meta_title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      faq_json TEXT NOT NULL,
      internal_links_json TEXT NOT NULL,
      readiness_score INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
      FOREIGN KEY (article_plan_id) REFERENCES article_plans(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      run_type TEXT NOT NULL,
      status TEXT NOT NULL,
      logs_json TEXT NOT NULL,
      output_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      draft_id TEXT NOT NULL,
      export_path TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
      FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
    )
  `
];
