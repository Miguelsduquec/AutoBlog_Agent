import { db } from "./database";
import { getSeedData } from "./seedData";

function resetDatabase(): void {
  db.exec(`
    DELETE FROM export_jobs;
    DELETE FROM automation_runs;
    DELETE FROM drafts;
    DELETE FROM article_plans;
    DELETE FROM content_opportunities;
    DELETE FROM seo_audit_runs;
    DELETE FROM website_analysis_runs;
    DELETE FROM website_pages;
    DELETE FROM websites;
    DELETE FROM user_sessions;
    DELETE FROM subscriptions;
    DELETE FROM users;
  `);
}

export function seedDatabase(reset = false): void {
  if (reset) {
    resetDatabase();
  }

  const seed = getSeedData();

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, email, name, password_hash, google_sub, stripe_customer_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of seed.users) {
    insertUser.run(
      user.id,
      user.email,
      user.name,
      user.passwordHash,
      user.googleSub,
      user.stripeCustomerId,
      user.createdAt,
      user.updatedAt
    );
  }

  const insertSubscription = db.prepare(`
    INSERT OR IGNORE INTO subscriptions (
      id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id, status, current_period_end, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const subscription of seed.subscriptions) {
    insertSubscription.run(
      subscription.id,
      subscription.userId,
      subscription.stripeCustomerId,
      subscription.stripeSubscriptionId,
      subscription.stripePriceId,
      subscription.stripeCheckoutSessionId,
      subscription.status,
      subscription.currentPeriodEnd,
      subscription.createdAt,
      subscription.updatedAt
    );
  }

  const insertWebsite = db.prepare(`
    INSERT OR IGNORE INTO websites (
      id, user_id, name, domain, language, target_country, niche, tone, content_goal, publishing_frequency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const website of seed.websites) {
    insertWebsite.run(
      website.id,
      website.userId,
      website.name,
      website.domain,
      website.language,
      website.targetCountry,
      website.niche,
      website.tone,
      website.contentGoal,
      website.publishingFrequency,
      website.createdAt,
      website.updatedAt
    );
  }

  const insertPage = db.prepare(`
    INSERT OR IGNORE INTO website_pages (
      id, website_id, url, title, meta_description, h1, headings_json, content_extract, page_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const page of seed.pages) {
    insertPage.run(
      page.id,
      page.websiteId,
      page.url,
      page.title,
      page.metaDescription,
      page.h1,
      JSON.stringify(page.headingsJson),
      page.contentExtract,
      page.pageType,
      page.createdAt
    );
  }

  const insertAnalysis = db.prepare(`
    INSERT OR IGNORE INTO website_analysis_runs (
      id, website_id, niche_summary, content_pillars_json, keywords_json, extracted_data_json, analyzed_page_count, confidence_level, confidence_score, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const run of seed.analysisRuns) {
    insertAnalysis.run(
      run.id,
      run.websiteId,
      run.nicheSummary,
      JSON.stringify(run.contentPillarsJson),
      JSON.stringify(run.keywordsJson),
      JSON.stringify(run.extractedDataJson),
      run.analyzedPageCount,
      run.confidenceLevel,
      run.confidenceScore,
      run.status,
      run.createdAt
    );
  }

  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO seo_audit_runs (
      id, website_id, score, findings_json, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  for (const audit of seed.seoAudits) {
    insertAudit.run(
      audit.id,
      audit.websiteId,
      audit.score,
      JSON.stringify(audit.findingsJson),
      audit.createdAt
    );
  }

  const insertOpportunity = db.prepare(`
    INSERT OR IGNORE INTO content_opportunities (
      id, website_id, keyword, topic, cluster, intent, relevance_score, estimated_difficulty, priority, source, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const opportunity of seed.opportunities) {
    insertOpportunity.run(
      opportunity.id,
      opportunity.websiteId,
      opportunity.keyword,
      opportunity.topic,
      opportunity.cluster,
      opportunity.intent,
      opportunity.relevanceScore,
      opportunity.estimatedDifficulty,
      opportunity.priority,
      opportunity.source,
      opportunity.status,
      opportunity.createdAt
    );
  }

  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO article_plans (
      id, website_id, opportunity_id, title, target_keyword, secondary_keywords_json, search_intent, angle, intent, cta, brief, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const plan of seed.articlePlans) {
    insertPlan.run(
      plan.id,
      plan.websiteId,
      plan.opportunityId,
      plan.title,
      plan.targetKeyword,
      JSON.stringify(plan.secondaryKeywordsJson),
      plan.searchIntent,
      plan.angle,
      plan.searchIntent,
      plan.cta,
      plan.brief,
      plan.status,
      plan.createdAt
    );
  }

  const insertDraft = db.prepare(`
    INSERT OR IGNORE INTO drafts (
      id, website_id, article_plan_id, outline_json, article_markdown, article_html, slug, meta_title, meta_description, faq_json, internal_links_json, readiness_score, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const draft of seed.drafts) {
    insertDraft.run(
      draft.id,
      draft.websiteId,
      draft.articlePlanId,
      JSON.stringify(draft.outlineJson),
      draft.articleMarkdown,
      draft.articleHtml,
      draft.slug,
      draft.metaTitle,
      draft.metaDescription,
      JSON.stringify(draft.faqJson),
      JSON.stringify(draft.internalLinksJson),
      draft.readinessScore,
      draft.status,
      draft.createdAt
    );
  }

  const insertRun = db.prepare(`
    INSERT OR IGNORE INTO automation_runs (
      id, website_id, run_type, status, logs_json, output_summary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const run of seed.automationRuns) {
    insertRun.run(
      run.id,
      run.websiteId,
      run.runType,
      run.status,
      JSON.stringify(run.logsJson),
      JSON.stringify(run.outputSummary),
      run.createdAt,
      run.updatedAt
    );
  }

  const insertExport = db.prepare(`
    INSERT OR IGNORE INTO export_jobs (
      id, website_id, draft_id, export_path, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const job of seed.exportJobs) {
    insertExport.run(job.id, job.websiteId, job.draftId, job.exportPath, job.status, job.createdAt);
  }
}

if (require.main === module) {
  seedDatabase(true);
  console.log("Database seeded with Autoblog Agent demo data.");
}
