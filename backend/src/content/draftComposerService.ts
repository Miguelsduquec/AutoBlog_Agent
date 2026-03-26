import { CONTENT_PROMPTS } from "../agent/prompts/contentPrompts";
import { ArticlePlan, Draft, Website, WebsitePage } from "../types";
import { createId } from "../utils/ids";
import { toSlug } from "../utils/slug";

function buildOutline(plan: ArticlePlan): string[] {
  return [
    `Why ${plan.targetKeyword} matters now`,
    `Key considerations before you act`,
    `How to approach ${plan.targetKeyword} effectively`,
    `Practical next steps and common mistakes`,
    `How to turn insights into action`
  ];
}

function buildSections(plan: ArticlePlan, website: Website): Array<{ heading: string; body: string }> {
  return [
    {
      heading: "Why this topic matters",
      body: `${plan.targetKeyword} is increasingly important for teams evaluating ${website.niche.toLowerCase()}. Businesses usually start searching for this topic when they want better clarity, better outcomes, or less operational friction.`
    },
    {
      heading: "What strong execution looks like",
      body: `The strongest approach is practical rather than abstract. Readers need context, decision criteria, and a clear path forward. ${website.name} can credibly address this because the website already focuses on ${website.contentGoal.toLowerCase()}.`
    },
    {
      heading: "A practical framework",
      body: `Start by clarifying the desired outcome, identify the main constraints, and map the work into a small number of repeatable steps. This creates content that is genuinely useful and also aligned with search intent.`
    },
    {
      heading: "Mistakes to avoid",
      body: `Many teams jump straight into tools or execution before they define ownership, content scope, and success criteria. That usually leads to weak outcomes and inconsistent publishing performance.`
    },
    {
      heading: "Next steps",
      body: `${plan.cta} This is where a publication-ready article can bridge educational search demand with the services or product motion already present on the website.`
    }
  ];
}

function markdownToHtml(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) {
        return `<h1>${line.slice(2)}</h1>`;
      }
      if (line.startsWith("## ")) {
        return `<h2>${line.slice(3)}</h2>`;
      }
      if (!line.trim()) {
        return "";
      }
      return `<p>${line}</p>`;
    })
    .join("");
}

export class DraftComposerService {
  composeDraft(website: Website, plan: ArticlePlan, pages: WebsitePage[]): Draft {
    const outline = buildOutline(plan);
    const sections = buildSections(plan, website);
    const markdownParts = [`# ${plan.title}`, "", `${CONTENT_PROMPTS.draftingStyle}`, ""];

    for (const section of sections) {
      markdownParts.push(`## ${section.heading}`);
      markdownParts.push("");
      markdownParts.push(section.body);
      markdownParts.push("");
    }

    markdownParts.push("## FAQ");
    markdownParts.push("");
    markdownParts.push(`What does "${plan.targetKeyword}" usually involve?`);
    markdownParts.push("");
    markdownParts.push(`It usually involves planning, prioritization, and a practical implementation path suited to the website's niche.`);

    const articleMarkdown = markdownParts.join("\n");
    const articleHtml = markdownToHtml(articleMarkdown);
    const supportPages = pages.filter((page) => ["service", "product", "homepage"].includes(page.pageType)).slice(0, 3);
    const internalLinks = supportPages.map((page) => ({
      label: page.title,
      url: page.url,
      reason: "Connect informational readers to high-intent pages."
    }));
    const faqJson = [
      {
        question: `How should teams approach ${plan.targetKeyword}?`,
        answer: "Start with outcomes, then use a repeatable framework that fits the business context."
      },
      {
        question: "What makes a draft review-ready?",
        answer: "Clear structure, search-intent alignment, metadata, and useful internal links."
      }
    ];
    const readinessScore = Math.min(95, 78 + internalLinks.length * 4 + faqJson.length * 3);

    return {
      id: createId("draft"),
      websiteId: website.id,
      articlePlanId: plan.id,
      outlineJson: outline,
      articleMarkdown,
      articleHtml,
      slug: toSlug(plan.title),
      metaTitle: plan.title.slice(0, 58),
      metaDescription: `Publication-ready draft for ${plan.targetKeyword} tailored to ${website.name} and its ${website.niche.toLowerCase()} positioning.`,
      faqJson,
      internalLinksJson: internalLinks,
      readinessScore,
      status: "review",
      createdAt: new Date().toISOString()
    };
  }
}
