import { CONTENT_PROMPTS } from "../agent/prompts/contentPrompts";
import { ArticlePlan, ContentOpportunity, Website } from "../types";
import { createId } from "../utils/ids";

function titleCase(input: string): string {
  return input
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function secondaryKeywords(keyword: string): string[] {
  return [
    `${keyword} guide`,
    `${keyword} checklist`,
    `${keyword} strategy`
  ];
}

export class ArticlePlannerService {
  createPlan(website: Website, opportunity: ContentOpportunity): ArticlePlan {
    const title = opportunity.intent === "Commercial"
      ? `How to Evaluate ${titleCase(opportunity.keyword)}`
      : titleCase(opportunity.keyword);

    return {
      id: createId("plan"),
      websiteId: website.id,
      opportunityId: opportunity.id,
      title,
      targetKeyword: opportunity.keyword,
      secondaryKeywordsJson: secondaryKeywords(opportunity.keyword),
      angle: `${CONTENT_PROMPTS.planningAngle} Emphasize ${website.niche.toLowerCase()} and the "${opportunity.cluster}" cluster.`,
      intent: opportunity.intent,
      cta: `Contact ${website.name} to turn this topic into action.`,
      brief: `Write a publication-ready article for ${website.name} focused on "${opportunity.keyword}". Tie the narrative to ${website.contentGoal.toLowerCase()} while keeping the tone ${website.tone.toLowerCase()}.`,
      status: "planned",
      createdAt: new Date().toISOString()
    };
  }
}
