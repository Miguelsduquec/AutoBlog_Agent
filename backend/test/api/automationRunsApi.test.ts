import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "../../src/db/seedData";
import { authHeaders, loginUser } from "../helpers/auth";
import { invokeApp } from "../helpers/invokeApp";

const app = createApp({ seed: false });

describe("Automation runs API", () => {
  it("triggers a full automation run and exposes the run detail endpoint", async () => {
    const { sessionToken } = await loginUser(app, DEMO_USER_EMAIL, DEMO_USER_PASSWORD);

    const createResponse = await invokeApp(app, {
      method: "POST",
      url: "/api/websites/site-greenforge/run-automation",
      body: {
        runType: "full-pipeline",
        maxOpportunities: 1,
        generateDrafts: true,
        exportDrafts: false
      },
      headers: authHeaders(sessionToken)
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
      url: `/api/automation-runs/${runId}`,
      headers: authHeaders(sessionToken)
    });

    expect(detailResponse.status).toBe(200);
    expect((detailResponse.body as any).id).toBe(runId);
    expect((detailResponse.body as any).outputSummary.outputIds.planIds.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray((detailResponse.body as any).logsJson)).toBe(true);
  });
});
