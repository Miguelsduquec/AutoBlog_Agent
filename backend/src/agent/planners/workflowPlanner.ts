export class WorkflowPlanner {
  buildAutomaticDraftPlan(targetDraftCount: number): string[] {
    return [
      "Analyze website",
      "Run SEO content audit",
      "Find article opportunities",
      `Generate up to ${targetDraftCount} article plans`,
      `Generate up to ${targetDraftCount} drafts`
    ];
  }
}
