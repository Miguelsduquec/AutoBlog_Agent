import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { ArticlePlan, ContentOpportunity, Draft, Website } from "../types";
import { toSlug } from "../utils/slug";

export type ExportPackageBuildResult = {
  exportPath: string;
  files: string[];
};

const REQUIRED_FILES = ["article.md", "content.html", "metadata.json", "seo.json", "brief.json"];

function sanitizeSegment(value: string, fallback: string): string {
  const slug = toSlug(value);
  return slug || fallback;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${trimmed.slice(2)}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${trimmed.slice(4)}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      html.push(`<h2>${trimmed.slice(3)}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html.push(`<h1>${trimmed.slice(2)}</h1>`);
      continue;
    }

    html.push(`<p>${trimmed}</p>`);
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("");
}

export class ExportService {
  buildPackage(
    draft: Draft,
    articlePlan: ArticlePlan,
    website: Website,
    sourceOpportunity: ContentOpportunity | null
  ): ExportPackageBuildResult {
    const websiteSlug = sanitizeSegment(website.name, sanitizeSegment(website.id, "website"));
    const draftFolder = sanitizeSegment(draft.slug || articlePlan.title || draft.id, sanitizeSegment(draft.id, "draft"));
    const exportPath = path.join(config.exportsDir, websiteSlug, draftFolder);

    fs.mkdirSync(exportPath, { recursive: true });

    const articleMarkdown = draft.articleMarkdown || `# ${articlePlan.title}\n\n${articlePlan.brief}`;
    const articleHtml = draft.articleHtml || markdownToHtml(articleMarkdown);
    const exportedAt = new Date().toISOString();

    const metadata = {
      draftId: draft.id,
      articlePlanId: articlePlan.id,
      websiteId: website.id,
      websiteName: website.name,
      title: articlePlan.title,
      slug: draft.slug || sanitizeSegment(articlePlan.title, "article"),
      status: draft.status,
      exportedAt
    };

    const seo = {
      metaTitle: draft.metaTitle || articlePlan.title,
      metaDescription: draft.metaDescription || articlePlan.brief,
      targetKeyword: articlePlan.targetKeyword,
      secondaryKeywords: articlePlan.secondaryKeywordsJson,
      faq: draft.faqJson ?? [],
      internalLinks: draft.internalLinksJson ?? [],
      readinessScore: draft.readinessScore ?? 0
    };

    const brief = {
      title: articlePlan.title,
      angle: articlePlan.angle,
      CTA: articlePlan.cta,
      searchIntent: articlePlan.searchIntent,
      brief: articlePlan.brief,
      sourceOpportunity: sourceOpportunity
        ? {
            id: sourceOpportunity.id,
            keyword: sourceOpportunity.keyword,
            topic: sourceOpportunity.topic,
            cluster: sourceOpportunity.cluster,
            intent: sourceOpportunity.intent
          }
        : null
    };

    fs.writeFileSync(path.join(exportPath, "article.md"), articleMarkdown, "utf-8");
    fs.writeFileSync(path.join(exportPath, "content.html"), articleHtml, "utf-8");
    fs.writeFileSync(path.join(exportPath, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
    fs.writeFileSync(path.join(exportPath, "seo.json"), JSON.stringify(seo, null, 2), "utf-8");
    fs.writeFileSync(path.join(exportPath, "brief.json"), JSON.stringify(brief, null, 2), "utf-8");

    return {
      exportPath,
      files: REQUIRED_FILES
    };
  }

  listExportedFiles(exportPath: string): string[] {
    if (!fs.existsSync(exportPath)) {
      return REQUIRED_FILES;
    }

    return fs
      .readdirSync(exportPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((left, right) => REQUIRED_FILES.indexOf(left) - REQUIRED_FILES.indexOf(right));
  }
}
