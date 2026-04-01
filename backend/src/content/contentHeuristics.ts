import { Website, WebsiteAnalysisRun } from "../types";
import { normalizeText } from "../utils/text";

export function inferAudience(website: Website, analysis: WebsiteAnalysisRun | null): string {
  const corpus = normalizeText(`${website.niche} ${website.contentGoal} ${analysis?.nicheSummary ?? ""}`);

  if (corpus.includes("finance")) {
    return "finance teams";
  }
  if (corpus.includes("bookkeeping") || corpus.includes("cash flow") || corpus.includes("reporting")) {
    return "small business owners";
  }
  if (corpus.includes("small business") || corpus.includes("smb")) {
    return "small businesses";
  }
  if (corpus.includes("local service")) {
    return "local service businesses";
  }
  if (corpus.includes("landscape") || corpus.includes("garden")) {
    return "homeowners";
  }
  if (corpus.includes("consult")) {
    return "business teams";
  }

  return "buyers";
}

export function buildContentCta(website: Website): string {
  const goal = normalizeText(website.contentGoal);

  if (goal.includes("demo") || goal.includes("walkthrough") || goal.includes("software")) {
    return "Request a demo";
  }
  if (goal.includes("quote") || goal.includes("local") || goal.includes("project")) {
    return "Request a quote";
  }
  if (goal.includes("design consultation")) {
    return "Book a design consultation";
  }
  if (goal.includes("lead") || goal.includes("consult") || goal.includes("qualified")) {
    return "Book a consultation";
  }

  return `Talk to ${website.name}`;
}
