import { db } from "../db/database";
import { ArticlePlan, ContentOpportunity, Draft } from "../types";
import { mapArticlePlan, mapDraft, mapOpportunity } from "./mappers";

export const opportunityRepository = {
  list(websiteId?: string): ContentOpportunity[] {
    if (websiteId) {
      const rows = db
        .prepare("SELECT * FROM content_opportunities WHERE website_id = ? ORDER BY datetime(created_at) DESC")
        .all(websiteId) as Record<string, unknown>[];
      return rows.map(mapOpportunity);
    }

    const rows = db.prepare("SELECT * FROM content_opportunities ORDER BY datetime(created_at) DESC").all() as Record<
      string,
      unknown
    >[];
    return rows.map(mapOpportunity);
  },

  getById(id: string): ContentOpportunity | null {
    const row = db.prepare("SELECT * FROM content_opportunities WHERE id = ?").get(id) as Record<
      string,
      unknown
    > | null;
    return row ? mapOpportunity(row) : null;
  },

  create(opportunity: ContentOpportunity): ContentOpportunity {
    db.prepare(`
      INSERT INTO content_opportunities (
        id, website_id, keyword, cluster, intent, relevance_score, estimated_difficulty, priority, source, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      opportunity.id,
      opportunity.websiteId,
      opportunity.keyword,
      opportunity.cluster,
      opportunity.intent,
      opportunity.relevanceScore,
      opportunity.estimatedDifficulty,
      opportunity.priority,
      opportunity.source,
      opportunity.status,
      opportunity.createdAt
    );

    return opportunity;
  },

  createMany(opportunities: ContentOpportunity[]): ContentOpportunity[] {
    const insert = db.prepare(`
      INSERT INTO content_opportunities (
        id, website_id, keyword, cluster, intent, relevance_score, estimated_difficulty, priority, source, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const opportunity of opportunities) {
        insert.run(
          opportunity.id,
          opportunity.websiteId,
          opportunity.keyword,
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
    });

    transaction();
    return opportunities;
  },

  update(opportunity: ContentOpportunity): ContentOpportunity {
    db.prepare(`
      UPDATE content_opportunities
      SET keyword = ?, cluster = ?, intent = ?, relevance_score = ?, estimated_difficulty = ?, priority = ?, source = ?, status = ?
      WHERE id = ?
    `).run(
      opportunity.keyword,
      opportunity.cluster,
      opportunity.intent,
      opportunity.relevanceScore,
      opportunity.estimatedDifficulty,
      opportunity.priority,
      opportunity.source,
      opportunity.status,
      opportunity.id
    );

    return opportunity;
  },

  top(limit = 5): ContentOpportunity[] {
    const rows = db
      .prepare(`
        SELECT * FROM content_opportunities
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END,
          relevance_score DESC
        LIMIT ?
      `)
      .all(limit) as Record<string, unknown>[];
    return rows.map(mapOpportunity);
  }
};

export const articlePlanRepository = {
  list(websiteId?: string): ArticlePlan[] {
    if (websiteId) {
      const rows = db
        .prepare("SELECT * FROM article_plans WHERE website_id = ? ORDER BY datetime(created_at) DESC")
        .all(websiteId) as Record<string, unknown>[];
      return rows.map(mapArticlePlan);
    }

    const rows = db.prepare("SELECT * FROM article_plans ORDER BY datetime(created_at) DESC").all() as Record<
      string,
      unknown
    >[];
    return rows.map(mapArticlePlan);
  },

  getById(id: string): ArticlePlan | null {
    const row = db.prepare("SELECT * FROM article_plans WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? mapArticlePlan(row) : null;
  },

  create(plan: ArticlePlan): ArticlePlan {
    db.prepare(`
      INSERT INTO article_plans (
        id, website_id, opportunity_id, title, target_keyword, secondary_keywords_json, angle, intent, cta, brief, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id,
      plan.websiteId,
      plan.opportunityId,
      plan.title,
      plan.targetKeyword,
      JSON.stringify(plan.secondaryKeywordsJson),
      plan.angle,
      plan.intent,
      plan.cta,
      plan.brief,
      plan.status,
      plan.createdAt
    );

    return plan;
  },

  createMany(plans: ArticlePlan[]): ArticlePlan[] {
    const insert = db.prepare(`
      INSERT INTO article_plans (
        id, website_id, opportunity_id, title, target_keyword, secondary_keywords_json, angle, intent, cta, brief, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const plan of plans) {
        insert.run(
          plan.id,
          plan.websiteId,
          plan.opportunityId,
          plan.title,
          plan.targetKeyword,
          JSON.stringify(plan.secondaryKeywordsJson),
          plan.angle,
          plan.intent,
          plan.cta,
          plan.brief,
          plan.status,
          plan.createdAt
        );
      }
    });

    transaction();
    return plans;
  },

  update(plan: ArticlePlan): ArticlePlan {
    db.prepare(`
      UPDATE article_plans
      SET title = ?, target_keyword = ?, secondary_keywords_json = ?, angle = ?, intent = ?, cta = ?, brief = ?, status = ?, opportunity_id = ?
      WHERE id = ?
    `).run(
      plan.title,
      plan.targetKeyword,
      JSON.stringify(plan.secondaryKeywordsJson),
      plan.angle,
      plan.intent,
      plan.cta,
      plan.brief,
      plan.status,
      plan.opportunityId,
      plan.id
    );

    return plan;
  }
};

export const draftRepository = {
  list(websiteId?: string): Draft[] {
    if (websiteId) {
      const rows = db
        .prepare("SELECT * FROM drafts WHERE website_id = ? ORDER BY datetime(created_at) DESC")
        .all(websiteId) as Record<string, unknown>[];
      return rows.map(mapDraft);
    }

    const rows = db.prepare("SELECT * FROM drafts ORDER BY datetime(created_at) DESC").all() as Record<string, unknown>[];
    return rows.map(mapDraft);
  },

  getById(id: string): Draft | null {
    const row = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? mapDraft(row) : null;
  },

  create(draft: Draft): Draft {
    db.prepare(`
      INSERT INTO drafts (
        id, website_id, article_plan_id, outline_json, article_markdown, article_html, slug, meta_title, meta_description, faq_json, internal_links_json, readiness_score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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

    return draft;
  },

  update(draft: Draft): Draft {
    db.prepare(`
      UPDATE drafts
      SET outline_json = ?, article_markdown = ?, article_html = ?, slug = ?, meta_title = ?, meta_description = ?, faq_json = ?, internal_links_json = ?, readiness_score = ?, status = ?
      WHERE id = ?
    `).run(
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
      draft.id
    );

    return draft;
  },

  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM drafts").get() as { count: number };
    return row.count;
  },

  countPendingReview(): number {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM drafts WHERE status IN ('review')")
      .get() as { count: number };
    return row.count;
  }
};
