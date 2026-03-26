import { CrawlResultPage, SeoFinding } from "../types";
import { createId } from "../utils/ids";

function createFinding(partial: Omit<SeoFinding, "id">): SeoFinding {
  return {
    id: createId("finding"),
    ...partial
  };
}

export function buildSeoAudit(pages: CrawlResultPage[]): { score: number; findings: SeoFinding[] } {
  const findings: SeoFinding[] = [];

  for (const page of pages) {
    if (!page.metaDescription || page.metaDescription.length < 80) {
      findings.push(
        createFinding({
          category: "missing meta descriptions",
          severity: "high",
          title: "Meta description is missing or too short",
          description: `The page "${page.title}" has limited SERP support.`,
          pageUrl: page.url,
          recommendation: "Write a benefit-led description between 120 and 160 characters."
        })
      );
    }

    if (page.title.length < 35) {
      findings.push(
        createFinding({
          category: "weak page titles",
          severity: "medium",
          title: "Page title is weaker than ideal",
          description: `The title "${page.title}" may not communicate enough context.`,
          pageUrl: page.url,
          recommendation: "Expand the title with clear topic and commercial context."
        })
      );
    }

    if (!page.h1 || page.headings.length < 3) {
      findings.push(
        createFinding({
          category: "poor heading structure",
          severity: "medium",
          title: "Heading structure is shallow",
          description: "The page lacks enough visible section hierarchy for readers and search engines.",
          pageUrl: page.url,
          recommendation: "Add a stronger H1 and supporting H2/H3 sections."
        })
      );
    }

    if (page.contentExtract.split(/\s+/).length < 90) {
      findings.push(
        createFinding({
          category: "thin content",
          severity: "medium",
          title: "Content depth is limited",
          description: "The page does not provide much indexable text.",
          pageUrl: page.url,
          recommendation: "Add explanatory copy, FAQs, proof points, or process details."
        })
      );
    }
  }

  const hasBlogSupport = pages.some((page) => page.pageType === "blog-support");
  if (!hasBlogSupport) {
    findings.push(
      createFinding({
        category: "missing blog support",
        severity: "high",
        title: "No meaningful blog or resource support section detected",
        description: "The site has strong core pages but limited informational expansion paths.",
        recommendation: "Create a recurring content program tied to priority service or product clusters."
      })
    );
  }

  findings.push(
    createFinding({
      category: "internal linking opportunities",
      severity: "low",
      title: "Contextual links can support future articles",
      description: "Core pages can pass authority into educational cluster content.",
      recommendation: "Link supporting articles back to service, solution, or conversion pages."
    })
  );

  findings.push(
    createFinding({
      category: "content coverage gaps",
      severity: "medium",
      title: "Topic coverage can be broadened around search intent stages",
      description: "The website appears stronger in direct-response content than early-stage discovery content.",
      recommendation: "Add informational and comparison content around buying questions, workflows, and planning."
    })
  );

  const score = Math.max(45, Math.min(96, 96 - findings.length * 4));
  return { score, findings };
}
