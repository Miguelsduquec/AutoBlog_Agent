import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { invokeApp } from "../helpers/invokeApp";

const app = createApp({ seed: false });

describe("Automation runs API", () => {
  it("triggers a full automation run and exposes the run detail endpoint", async () => {
    const createResponse = await invokeApp(app, {
      method: "POST",
      url: "/api/websites/site-greenforge/run-automation",
      body: {
        runType: "full-pipeline",
        maxOpportunities: 1,
        generateDrafts: true,
        exportDrafts: false
      }
    });

    expect(createResponse.status).toBe(201);
    expect((createResponse.body as any).websiteId).toBe("site-greenforge");
    expect((createResponse.body as any).runType).toBe("full-pipeline");
    expect((createResponse.body as any).status).toMatch(/completed|partial/);
    expect((createResponse.body as any).outputSummary.message.length).toBeGreaterThan(0);
    expect((createResponse.body as any).logsJson.length).toBeGreaterThan(2);

    const runId = (createResponse.body as any).id as string;
    const detailResponse = await invokeApp(app, {
      method: "GET",
      url: `/api/automation-runs/${runId}`
    });

    expect(detailResponse.status).toBe(200);
    expect((detailResponse.body as any).id).toBe(runId);
    expect((detailResponse.body as any).outputSummary.outputIds.planIds.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray((detailResponse.body as any).logsJson)).toBe(true);
  });
});
