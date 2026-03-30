import { DraftGeneratorService } from "../content/draftGeneratorService";
import { analysisRepository } from "../repositories/analysisRepository";
import { articlePlanRepository, draftRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { Draft, DraftGenerationResult } from "../types";

export class DraftService {
  private readonly generator = new DraftGeneratorService();

  listDrafts(websiteId?: string): Draft[] {
    return draftRepository.list(websiteId);
  }

  getDraft(id: string): Draft | null {
    return draftRepository.getById(id);
  }

  generateFromArticlePlan(planId: string, regenerate = false): DraftGenerationResult {
    const plan = articlePlanRepository.getById(planId);
    if (!plan) {
      throw new Error("Article plan not found.");
    }

    const website = websiteRepository.getById(plan.websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const latestAnalysis = analysisRepository.getLatestByWebsiteId(plan.websiteId);
    const pages = websitePageRepository.listByWebsiteId(plan.websiteId);
    const existingDraft = draftRepository.findByArticlePlanId(plan.id);

    if (existingDraft && !regenerate) {
      if (plan.status !== existingDraft.status) {
        articlePlanRepository.update({
          ...plan,
          status: existingDraft.status
        });
      }

      return {
        draft: existingDraft,
        skipped: true,
        regenerated: false,
        summaryMessage: `A draft already exists for "${plan.title}".`
      };
    }

    const draft = this.generator.generateDraft(plan, website, latestAnalysis, pages, existingDraft);
    articlePlanRepository.update({
      ...plan,
      status: draft.status
    });

    if (existingDraft) {
      const updated = draftRepository.update(draft);
      return {
        draft: updated,
        skipped: false,
        regenerated: true,
        summaryMessage: `Regenerated the draft for "${plan.title}".`
      };
    }

    const created = draftRepository.create(draft);
    return {
      draft: created,
      skipped: false,
      regenerated: false,
      summaryMessage: `Created a new draft for "${plan.title}".`
    };
  }

  generateDraft(planId: string): Draft {
    return this.generateFromArticlePlan(planId).draft;
  }

  generateDraftsForWebsite(websiteId: string, limit = 3): Draft[] {
    const existingDraftPlanIds = new Set(
      draftRepository
        .list(websiteId)
        .map((draft) => draft.articlePlanId)
    );

    const plans = articlePlanRepository
      .list(websiteId)
      .filter((plan) => plan.status === "planned" && !existingDraftPlanIds.has(plan.id))
      .slice(0, limit);

    return plans
      .map((plan) => this.generateFromArticlePlan(plan.id))
      .filter((result) => !result.skipped)
      .map((result) => result.draft);
  }

  regenerateSection(draftId: string, section: "outline" | "body" | "meta" | "faq"): Draft {
    const draft = draftRepository.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }

    if (section === "outline") {
      draft.outlineJson = [...draft.outlineJson, "New angle to support search intent"];
    }

    if (section === "body") {
      draft.articleMarkdown = `${draft.articleMarkdown}\n\n## Added revision\n\nThis regenerated section adds another operational example and sharper transition into the CTA.`;
      draft.articleHtml = `${draft.articleHtml}<h2>Added revision</h2><p>This regenerated section adds another operational example and sharper transition into the CTA.</p>`;
    }

    if (section === "meta") {
      draft.metaTitle = `${draft.metaTitle}`.slice(0, 52) + " | Guide";
      draft.metaDescription = `${draft.metaDescription} Updated to improve click-through and clarity.`;
    }

    if (section === "faq") {
      draft.faqJson = [
        ...draft.faqJson,
        {
          question: "Can this section be regenerated without rewriting the full draft?",
          answer: "Yes. The MVP supports targeted refreshes for body copy, metadata, outline, and FAQ content."
        }
      ];
    }

    draft.readinessScore = Math.min(98, draft.readinessScore + 2);
    return draftRepository.update(draft);
  }

  markReviewReady(draftId: string): Draft {
    const draft = draftRepository.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }

    draft.status = "ready";
    draft.readinessScore = Math.max(draft.readinessScore, 90);
    return draftRepository.update(draft);
  }
}
