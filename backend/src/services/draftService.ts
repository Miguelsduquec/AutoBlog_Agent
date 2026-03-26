import { DraftComposerService } from "../content/draftComposerService";
import { articlePlanRepository, draftRepository } from "../repositories/contentRepository";
import { websitePageRepository, websiteRepository } from "../repositories/websiteRepository";
import { Draft } from "../types";

export class DraftService {
  private readonly composer = new DraftComposerService();

  listDrafts(websiteId?: string): Draft[] {
    return draftRepository.list(websiteId);
  }

  getDraft(id: string): Draft | null {
    return draftRepository.getById(id);
  }

  generateDraft(planId: string): Draft {
    const plan = articlePlanRepository.getById(planId);
    if (!plan) {
      throw new Error("Article plan not found.");
    }

    const website = websiteRepository.getById(plan.websiteId);
    if (!website) {
      throw new Error("Website not found.");
    }

    const pages = websitePageRepository.listByWebsiteId(plan.websiteId);
    const draft = this.composer.composeDraft(website, plan, pages);
    articlePlanRepository.update({
      ...plan,
      status: "drafting"
    });
    return draftRepository.create(draft);
  }

  generateDraftsForWebsite(websiteId: string, limit = 3): Draft[] {
    const plans = articlePlanRepository
      .list(websiteId)
      .filter((plan) => plan.status === "planned")
      .slice(0, limit);

    return plans.map((plan) => this.generateDraft(plan.id));
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
