import { ArticlePlan, Draft, Website, WebsiteAnalysisRun, WebsitePage } from "../types";
import { createId } from "../utils/ids";
import { toSlug } from "../utils/slug";
import { formatKeywordAsTopic, normalizeText, trimToLength } from "../utils/text";
import { inferAudience } from "./contentHeuristics";

type DraftSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(" ").filter(Boolean));

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

function extractKeySupportTerms(plan: ArticlePlan, analysis: WebsiteAnalysisRun | null): string[] {
  return [
    ...plan.secondaryKeywordsJson,
    ...(analysis?.extractedDataJson.h2Headings ?? []),
    ...(analysis?.keywordsJson ?? [])
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((item) => normalizeText(item) === normalizeText(value)) === index)
    .slice(0, 5);
}

function buildOutline(plan: ArticlePlan, audience: string, supportTerms: string[]): string[] {
  const firstSupport = supportTerms[0] ?? formatKeywordAsTopic(plan.targetKeyword);
  const secondSupport = supportTerms[1] ?? "Implementation priorities";

  return [
    `Introduction: ${plan.title}`,
    `What ${formatKeywordAsTopic(plan.targetKeyword)} looks like in practice`,
    `${titleCaseForHeading(firstSupport)} and the decisions that shape results`,
    `A practical framework for ${formatKeywordAsTopic(plan.targetKeyword)}`,
    `Common mistakes when teams approach ${formatKeywordAsTopic(plan.targetKeyword)}`,
    `Conclusion: next steps for ${audience}`
  ];
}

function titleCaseForHeading(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildSections(
  plan: ArticlePlan,
  website: Website,
  analysis: WebsiteAnalysisRun | null,
  audience: string,
  supportTerms: string[]
): DraftSection[] {
  const primaryTheme = supportTerms[0] ?? website.niche;
  const secondaryTheme = supportTerms[1] ?? plan.secondaryKeywordsJson[0] ?? "implementation planning";
  const pageReference = analysis?.extractedDataJson.pageSignals.find((page) => page.pageType === "service" || page.pageType === "product");
  const blogReference = analysis?.extractedDataJson.pageSignals.find((page) => page.pageType === "blog-support");
  const nicheSummary = analysis?.nicheSummary ?? `${website.name} focuses on ${website.niche.toLowerCase()}.`;

  return [
    {
      heading: `Why ${formatKeywordAsTopic(plan.targetKeyword)} matters for ${audience}`,
      paragraphs: [
        `${formatKeywordAsTopic(plan.targetKeyword)} matters because readers searching for it are usually trying to solve a real workflow, buying, or implementation problem. They are not looking for a vague overview. They need an article that explains what the topic changes in practice and how to evaluate the right next step.`,
        `${website.name} is positioned around ${website.niche.toLowerCase()}, so the draft should connect this topic to the kind of outcomes the website already promises. ${nicheSummary}`
      ]
    },
    {
      heading: `What strong ${primaryTheme.toLowerCase()} execution looks like`,
      paragraphs: [
        `A credible article should clarify what good execution looks like before it moves into tactics. In this case, that means showing how ${formatKeywordAsTopic(plan.targetKeyword).toLowerCase()} connects to planning, ownership, and measurable business outcomes rather than treating it as a purely abstract concept.`,
        pageReference
          ? `The website already signals relevance through pages like "${pageReference.title}", so the article should bridge educational intent with the service or product context readers can act on later.`
          : `The article should bridge educational intent with the website's real offer so that the CTA feels earned rather than bolted on.`
      ],
      bullets: [
        `Define the business problem behind ${plan.targetKeyword}`,
        `Show what success looks like for ${audience}`,
        `Use criteria that help readers compare options without overcomplicating the decision`
      ]
    },
    {
      heading: `A practical framework for ${secondaryTheme.toLowerCase()}`,
      paragraphs: [
        `The middle of the article should move from concept to execution. This is where the editorial angle matters most: ${plan.angle}`,
        `A strong structure usually works in four stages: explain the current friction, outline the decision points, show a practical path forward, and reinforce how teams can start without turning the project into a heavyweight initiative.`
      ],
      bullets: [
        `Start with the constraints readers already feel today`,
        `Break the solution into 3 to 5 realistic decisions`,
        `Use supporting terms such as ${supportTerms.slice(0, 3).join(", ")} to broaden topical coverage naturally`
      ]
    },
    {
      heading: `Common mistakes when teams approach ${formatKeywordAsTopic(plan.targetKeyword).toLowerCase()}`,
      paragraphs: [
        `One of the most common mistakes is treating ${plan.targetKeyword} like a checklist item instead of a capability that needs scope, ownership, and follow-through. That usually leads to articles that sound polished but do not help the reader make a confident decision.`,
        blogReference
          ? `Another mistake is ignoring adjacent topics the website already hints at through pages such as "${blogReference.title}". A better article acknowledges the wider context and uses it to make the guidance feel more credible.`
          : `Another mistake is skipping the surrounding context. Readers need examples, trade-offs, and implementation cautions to trust the advice.`
      ]
    },
    {
      heading: "How to turn this research into next steps",
      paragraphs: [
        `The conclusion should convert clarity into motion. That means summarizing the practical takeaway, pointing readers toward the next sensible action, and connecting the article back to the website's offer in a way that feels useful.`,
        `${plan.cta}. This CTA works best when it follows naturally from the advice already given instead of interrupting the article with a hard sell.`
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
    `Learn ${plan.targetKeyword} with practical guidance for ${audience}. Cover key decisions, common mistakes, and clear next steps with ${website.name}.`,
    158
  );
}

function buildFaq(plan: ArticlePlan, website: Website, audience: string): Draft["faqJson"] {
  const keyword = plan.targetKeyword;
  const questions = [
    {
      question: `What should ${audience} understand first about ${keyword}?`,
      answer: `Start with the operational or buying problem behind ${keyword}, then evaluate the decision points that matter most for scope, ownership, and expected outcomes.`
    },
    {
      question: `How detailed should an article about ${keyword} be?`,
      answer: "It should move beyond definitions and include practical examples, decision criteria, and the mistakes readers should avoid."
    },
    {
      question: `What makes content about ${keyword} feel credible?`,
      answer: "Specific examples, clear trade-offs, and advice that connects the topic back to real implementation or business outcomes."
    }
  ];

  if (plan.searchIntent === "commercial" || plan.searchIntent === "comparison") {
    questions.push({
      question: `When should someone talk to ${website.name}?`,
      answer: `When the team understands the problem but needs help evaluating options, narrowing scope, or turning the chosen approach into a workable plan.`
    });
  } else {
    questions.push({
      question: `What should readers do after learning about ${keyword}?`,
      answer: "Define the first useful step, identify who owns it, and use the article to guide a practical rollout instead of collecting more abstract advice."
    });
  }

  return questions.slice(0, 4);
}

function buildInternalLinks(plan: ArticlePlan, pages: WebsitePage[]): Draft["internalLinksJson"] {
  const keywordCorpus = [plan.targetKeyword, ...plan.secondaryKeywordsJson, plan.title].join(" ");

  const scored = pages
    .map((page) => {
      const pageCorpus = `${page.title} ${page.h1} ${page.headingsJson.join(" ")} ${page.contentExtract}`;
      let score = overlapScore(keywordCorpus, pageCorpus);

      if (["service", "product", "homepage"].includes(page.pageType)) {
        score += 0.12;
      }
      if (page.pageType === "blog-support") {
        score += 0.04;
      }

      return {
        page,
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .filter((entry) => entry.score > 0.08 || ["service", "product", "homepage"].includes(entry.page.pageType));

  return scored.map(({ page }) => ({
    label: page.title,
    url: page.url,
    reason:
      page.pageType === "homepage"
        ? "Use the homepage as a trust-building overview page."
        : page.pageType === "service" || page.pageType === "product"
          ? "Connect educational readers to a higher-intent page."
          : "Support the article with adjacent educational context."
  }));
}

function calculateReadinessScore(
  draft: Pick<Draft, "outlineJson" | "articleMarkdown" | "metaTitle" | "metaDescription" | "faqJson" | "internalLinksJson">,
  plan: ArticlePlan,
  analysis: WebsiteAnalysisRun | null
): number {
  const wordCount = draft.articleMarkdown.split(/\s+/).filter(Boolean).length;
  let score = 34;

  if (overlapScore(plan.title, plan.targetKeyword) >= 0.35 || normalizeText(plan.title).includes(normalizeText(plan.targetKeyword))) {
    score += 10;
  }
  if (draft.outlineJson.length >= 6) {
    score += 8;
  }
  if (draft.metaTitle && draft.metaDescription) {
    score += 10;
  }
  if (draft.faqJson.length >= 3) {
    score += 6;
  }
  if (draft.internalLinksJson.length >= 2) {
    score += 6;
  }
  if (wordCount >= 950) {
    score += 18;
  } else if (wordCount >= 750) {
    score += 14;
  } else if (wordCount >= 550) {
    score += 10;
  } else if (wordCount >= 400) {
    score += 4;
  }
  if (normalizeText(draft.articleMarkdown).includes(normalizeText(plan.targetKeyword))) {
    score += 8;
  }

  if (analysis?.confidenceLevel === "high") {
    score += 8;
  } else if (analysis?.confidenceLevel === "medium") {
    score += 2;
  } else if (analysis?.confidenceLevel === "low") {
    score -= 14;
  }

  return Math.max(22, Math.min(94, score));
}

export class DraftGeneratorService {
  generateDraft(
    plan: ArticlePlan,
    website: Website,
    analysis: WebsiteAnalysisRun | null,
    pages: WebsitePage[],
    existingDraft?: Draft | null
  ): Draft {
    const audience = inferAudience(website, analysis);
    const supportTerms = extractKeySupportTerms(plan, analysis);
    const outline = buildOutline(plan, audience, supportTerms);
    const sections = buildSections(plan, website, analysis, audience, supportTerms);
    const faqJson = buildFaq(plan, website, audience);
    const internalLinksJson = buildInternalLinks(plan, pages);

    const markdownParts: string[] = [
      `# ${plan.title}`,
      "",
      `Teams looking into ${plan.targetKeyword} usually need a clearer path from research to action. This article explains the topic in the context of ${website.niche.toLowerCase()}, highlights what matters most for ${audience}, and keeps the advice grounded in real implementation decisions.`,
      "",
      `The angle for this piece is simple: ${plan.angle}`,
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
      `A strong article on ${plan.targetKeyword} should leave readers with a clearer decision path and a realistic next step. For ${website.name}, that means keeping the article useful first, then connecting the advice back to the offer in a way that feels credible.`
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
      plan,
      analysis
    );
    const wordCount = articleMarkdown.split(/\s+/).filter(Boolean).length;
    const status = readinessScore >= 78 && analysis?.confidenceLevel !== "low" && wordCount >= 700 ? "review" : "drafting";

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
