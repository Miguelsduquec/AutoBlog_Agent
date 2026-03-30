import { db } from "../db/database";
import { Website, WebsitePage } from "../types";
import { mapWebsite, mapWebsitePage } from "./mappers";

export const websiteRepository = {
  list(): Website[] {
    const rows = db.prepare("SELECT * FROM websites ORDER BY datetime(updated_at) DESC").all() as Record<string, unknown>[];
    return rows.map(mapWebsite);
  },

  getById(id: string): Website | null {
    const row = db.prepare("SELECT * FROM websites WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? mapWebsite(row) : null;
  },

  create(website: Website): Website {
    db.prepare(`
      INSERT INTO websites (
        id, name, domain, language, target_country, niche, tone, content_goal, publishing_frequency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      website.id,
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

    return website;
  },

  update(website: Website): Website {
    db.prepare(`
      UPDATE websites
      SET name = ?, domain = ?, language = ?, target_country = ?, niche = ?, tone = ?, content_goal = ?, publishing_frequency = ?, updated_at = ?
      WHERE id = ?
    `).run(
      website.name,
      website.domain,
      website.language,
      website.targetCountry,
      website.niche,
      website.tone,
      website.contentGoal,
      website.publishingFrequency,
      website.updatedAt,
      website.id
    );

    return website;
  },

  delete(id: string): void {
    db.prepare("DELETE FROM websites WHERE id = ?").run(id);
  },

  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM websites").get() as { count: number };
    return row.count;
  }
};

export const websitePageRepository = {
  listByWebsiteId(websiteId: string): WebsitePage[] {
    const rows = db
      .prepare("SELECT * FROM website_pages WHERE website_id = ? ORDER BY datetime(created_at) DESC")
      .all(websiteId) as Record<string, unknown>[];
    return rows.map(mapWebsitePage);
  },

  replaceForWebsite(websiteId: string, pages: WebsitePage[]): void {
    const removeStatement = db.prepare("DELETE FROM website_pages WHERE website_id = ?");
    const insertStatement = db.prepare(`
      INSERT INTO website_pages (
        id, website_id, url, title, meta_description, h1, headings_json, content_extract, page_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      removeStatement.run(websiteId);
      for (const page of pages) {
        insertStatement.run(
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
    });

    transaction();
  },

  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM website_pages").get() as { count: number };
    return row.count;
  }
};
