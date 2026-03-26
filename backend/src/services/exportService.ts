import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { articlePlanRepository, draftRepository } from "../repositories/contentRepository";
import { exportJobRepository } from "../repositories/operationsRepository";
import { websiteRepository } from "../repositories/websiteRepository";
import { ExportJob } from "../types";
import { createId } from "../utils/ids";
import { toSlug } from "../utils/slug";

export class ExportService {
  listExports(websiteId?: string): ExportJob[] {
    return exportJobRepository.list(websiteId);
  }

  createExport(draftId: string): ExportJob {
    const draft = draftRepository.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }

    const website = websiteRepository.getById(draft.websiteId);
    const plan = articlePlanRepository.getById(draft.articlePlanId);
    if (!website || !plan) {
      throw new Error("Draft context is incomplete.");
    }

    const directory = path.join(config.exportsDir, toSlug(website.name), draft.slug);
    fs.mkdirSync(directory, { recursive: true });

    fs.writeFileSync(path.join(directory, "content.html"), draft.articleHtml);
    fs.writeFileSync(path.join(directory, "article.md"), draft.articleMarkdown);
    fs.writeFileSync(
      path.join(directory, "metadata.json"),
      JSON.stringify(
        {
          slug: draft.slug,
          title: plan.title,
          metaTitle: draft.metaTitle,
          metaDescription: draft.metaDescription,
          readinessScore: draft.readinessScore
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(directory, "seo.json"),
      JSON.stringify(
        {
          targetKeyword: plan.targetKeyword,
          secondaryKeywords: plan.secondaryKeywordsJson,
          faq: draft.faqJson,
          internalLinks: draft.internalLinksJson
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(directory, "brief.json"),
      JSON.stringify(
        {
          website: website.name,
          niche: website.niche,
          brief: plan.brief,
          cta: plan.cta,
          angle: plan.angle
        },
        null,
        2
      )
    );

    const job: ExportJob = {
      id: createId("export"),
      websiteId: draft.websiteId,
      draftId: draft.id,
      exportPath: directory,
      status: "exported",
      createdAt: new Date().toISOString()
    };

    exportJobRepository.create(job);
    return job;
  }
}
