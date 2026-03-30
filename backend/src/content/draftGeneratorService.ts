import { CONTENT_PROMPTS } from "../agent/prompts/contentPrompts";
import { ArticlePlan, Draft, Website, WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";
import { toSlug } from "../utils/slug";

type DraftSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(normalize(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalize(right).split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function detectAudience(website: Website, analysis: WebsiteAnalysisRun | null): string {
  const corpus = normalize(`${website.niche} ${website.contentGoal} ${analysis?.nicheSummary ?? ""}`);

  if (corpus.includes("finance")) {
    return "finance teams";
  }
  if (corpus.includes("small business") || corpus.includes("smb")) {
    return "small businesses";
  }
  if (corpus.includes("landscape") || corpus.includes("garden")) {
    return "homeowners";
  }
  if (corpus.includes("consult")) {
    return "operations leaders";
  }

  return "buyers";
}

function buildOutline(plan: ArticlePlan, audience: string): string[] {
  return [
    `Introduction: ${plan.title}`,
    `Why ${plan.targetKeyword} matters for ${audience}`,
    `What strong execution looks like`,
    `A practical framework for ${plan.targetKeyword}`,
    `Common mistakes and implementation tips`,
    `Conclusion and next steps`
  ];
}

function buildSections(
  plan: ArticlePlan,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  audience: string
): DraftSection[] {
  const supportingTerms = plan.secondaryKeywordsJson.slice(0, 3).join(", ");
  const analysisSummary = analysis?.nicheSummary ?? `${website.name} focuses on ${website.niche.toLowerCase()}.`;
  const extractedHeading = analysis?.extractedDataJson.h2Headings[0] ?? website.niche;
  const keywordLabel = titleCase(plan.targetKeyword);

  return [
    {
      heading: "Why this topic matters",
      paragraphs: [
        `${keywordLabel} is a meaningful topic for ${audience} because it sits close to real buying or implementation decisions. Searchers usually arrive here when they need more than a definition. They want guidance that helps them reduce confusion, choose the right next step, and avoid wasted effort.`,
        `${analysisSummary} That context matters because the article should feel grounded in the website's expertise rather than sounding like a generic AI explainer.`
      ]
    },
    {
      heading: "What readers need to understand first",
      paragraphs: [
        `Before jumping into tools or tactics, readers should understand the operational problem behind ${plan.targetKeyword}. The right framing depends on search intent: ${plan.searchIntent}. That means the article should balance clarity, decision support, and practical context.`,
        `The editorial angle for this piece is straightforward: ${plan.angle}`
      ],
      bullets: [
        `Clarify the outcome the reader is trying to achieve`,
        `Explain how ${extractedHeading.toLowerCase()} connects to the wider business goal`,
        `Use examples that reflect ${website.niche.toLowerCase()} rather than abstract best practices`
      ]
    },
    {
      heading: `A practical framework for ${plan.targetKeyword}`,
      paragraphs: [
        `A strong article should move through the topic in a useful order: define the problem, show what good looks like, outline practical choices, and then make implementation feel manageable. This keeps the piece readable while still supporting SEO intent.`,
        `Use supporting terms such as ${supportingTerms} to broaden coverage naturally. They should appear as helpful context inside the article, not as forced keyword stuffing.`
      ],
      bullets: [
        `Start with the reader's current challenge`,
        `Break the solution into 3 to 5 realistic decisions`,
        `Show how teams can apply the idea without unnecessary complexity`
      ]
    },
    {
      heading: "Common mistakes to avoid",
      paragraphs: [
        `One common mistake is treating ${plan.targetKeyword} as a purely technical topic when the real risk is usually operational. Teams often move too quickly into tooling, skip ownership decisions, or underestimate how change management affects outcomes.`,
        `Another mistake is writing the article in a way that sounds polished but unhelpful. The best version of this draft should feel credible, specific, and aligned with the tone "${website.tone}".`
      ]
    },
    {
      heading: "How to turn the topic into next steps",
      paragraphs: [
        `The conclusion should help readers move from research into action. That does not require a hard sell. It simply means connecting the article back to the website's real offer and giving the reader a sensible next step.`,
        `${plan.cta}. This CTA works best when it feels like the natural continuation of the advice already provided in the article.`
      ]
    }
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      html.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
      continue;
    }

    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("");
}

function buildMetaTitle(plan: ArticlePlan, website: Website): string {
  const withBrand = `${plan.title} | ${website.name}`;
  if (withBrand.length <= 60) {
    return withBrand;
  }

  return trimToLength(plan.title, 60);
}

function buildMetaDescription(plan: ArticlePlan, website: Website, audience: string): string {
  return trimToLength(
    `Learn ${plan.targetKeyword} with practical guidance for ${audience}. Understand key decisions, common mistakes, and the next best step with ${website.name}.`,
    158
  );
}

function buildFaq(plan: ArticlePlan, website: Website, audience: string): Draft["faqJson"] {
  const keyword = plan.targetKeyword;
  const commonQuestions = [
    {
      question: `What should teams understand first about ${keyword}?`,
      answer: `They should start with the business problem behind ${keyword}, then evaluate the best path based on goals, constraints, and the level of change required.`
    },
    {
      question: `How can ${audience} approach ${keyword} without overcomplicating it?`,
      answer: "Focus on outcomes, define ownership early, and use a step-by-step rollout instead of trying to solve everything at once."
    },
    {
      question: `What mistakes are most common when working on ${keyword}?`,
      answer: "The most common mistakes are weak scoping, unclear ownership, and jumping into execution before the team agrees on what success looks like."
    }
  ];

  if (plan.searchIntent === "commercial" || plan.searchIntent === "comparison") {
    commonQuestions.push({
      question: `When should someone talk to ${website.name}?`,
      answer: `When the team has a clear problem to solve but needs help evaluating options, narrowing scope, or turning strategy into an implementation plan.`
    });
  } else {
    commonQuestions.push({
      question: `How do readers know they are ready to act on ${keyword}?`,
      answer: "They are ready when they can define the desired outcome, name the constraints, and identify the first small step that moves the work forward."
    });
  }

  return commonQuestions.slice(0, 4);
}

function buildInternalLinks(plan: ArticlePlan, pages: WebsitePage[]): Draft["internalLinksJson"] {
  const keywordCorpus = [plan.targetKeyword, ...plan.secondaryKeywordsJson, plan.title].join(" ");

  const scored = pages
    .map((page) => {
      const pageCorpus = `${page.title} ${page.h1} ${page.headingsJson.join(" ")} ${page.contentExtract}`;
      let score = overlapScore(keywordCorpus, pageCorpus);

      if (["service", "product", "homepage"].includes(page.pageType)) {
        score += 0.08;
      }

      return {
        page,
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .filter((entry) => entry.score > 0 || ["service", "product", "homepage"].includes(entry.page.pageType));

  return scored.map(({ page }) => ({
    label: page.title,
    url: page.url,
    reason:
      page.pageType === "homepage"
        ? "Use the homepage as a broad trust-building destination."
        : page.pageType === "service" || page.pageType === "product"
          ? "Connect educational readers to a high-intent page."
          : "Support the article with adjacent informational context."
  }));
}

function calculateReadinessScore(draft: Pick<Draft, "outlineJson" | "articleMarkdown" | "metaTitle" | "metaDescription" | "faqJson" | "internalLinksJson">, plan: ArticlePlan): number {
  const wordCount = draft.articleMarkdown.split(/\s+/).filter(Boolean).length;
  let score = 56;

  if (overlapScore(plan.title, plan.targetKeyword) >= 0.35 || normalize(plan.title).includes(normalize(plan.targetKeyword))) {
    score += 10;
  }
  if (draft.outlineJson.length >= 6) {
    score += 10;
  }
  if (draft.metaTitle && draft.metaDescription) {
    score += 12;
  }
  if (draft.faqJson.length >= 3) {
    score += 8;
  }
  if (draft.internalLinksJson.length >= 2) {
    score += 8;
  }
  if (wordCount >= 850) {
    score += 12;
  } else if (wordCount >= 650) {
    score += 8;
  } else if (wordCount >= 450) {
    score += 4;
  }
  if (normalize(draft.articleMarkdown).includes(normalize(plan.targetKeyword))) {
    score += 8;
  }

  return Math.max(48, Math.min(97, score));
}

export class DraftGeneratorService {
  generateDraft(
    plan: ArticlePlan,
    website: Website,
    analysis: WebsiteAnalysisRun | null,
    pages: WebsitePage[],
    existingDraft?: Draft | null
  ): Draft {
    const audience = detectAudience(website, analysis);
    const outline = buildOutline(plan, audience);
    const sections = buildSections(plan, website, analysis, audience);
    const faqJson = buildFaq(plan, website, audience);
    const internalLinksJson = buildInternalLinks(plan, pages);

    const markdownParts: string[] = [
      `# ${plan.title}`,
      "",
      CONTENT_PROMPTS.draftingStyle,
      "",
      `Readers searching for ${plan.targetKeyword} usually need practical guidance, not abstract commentary. This draft is designed to explain the topic clearly, connect it to ${website.niche.toLowerCase()}, and move naturally toward the CTA without sounding forced.`,
      "",
      `The article angle is simple: ${plan.angle}`,
      ""
    ];

    for (const section of sections) {
      markdownParts.push(`## ${section.heading}`);
      markdownParts.push("");
      for (const paragraph of section.paragraphs) {
        markdownParts.push(paragraph);
        markdownParts.push("");
      }
      if (section.bullets?.length) {
        for (const bullet of section.bullets) {
          markdownParts.push(`- ${bullet}`);
        }
        markdownParts.push("");
      }
    }

    markdownParts.push("## FAQ");
    markdownParts.push("");
    for (const item of faqJson) {
      markdownParts.push(`### ${item.question}`);
      markdownParts.push("");
      markdownParts.push(item.answer);
      markdownParts.push("");
    }

    markdownParts.push("## Conclusion");
    markdownParts.push("");
    markdownParts.push(
      `A strong article on ${plan.targetKeyword} should leave the reader with clarity, a practical next step, and confidence that the topic is manageable. For ${website.name}, that means connecting educational content to the website's real offer without losing usefulness.`
    );
    markdownParts.push("");
    markdownParts.push(`${plan.cta}.`);

    const articleMarkdown = markdownParts.join("\n");
    const articleHtml = markdownToHtml(articleMarkdown);
    const metaTitle = buildMetaTitle(plan, website);
    const metaDescription = buildMetaDescription(plan, website, audience);
    const readinessScore = calculateReadinessScore(
      {
        outlineJson: outline,
        articleMarkdown,
        metaTitle,
        metaDescription,
        faqJson,
        internalLinksJson
      },
      plan
    );
    const status = readinessScore >= 82 ? "review" : "drafting";

    return {
      id: existingDraft?.id ?? createId("draft"),
      websiteId: website.id,
      articlePlanId: plan.id,
      outlineJson: outline,
      articleMarkdown,
      articleHtml,
      slug: toSlug(plan.title),
      metaTitle,
      metaDescription,
      faqJson,
      internalLinksJson,
      readinessScore,
      status,
      createdAt: existingDraft?.createdAt ?? new Date().toISOString()
    };
  }
}
