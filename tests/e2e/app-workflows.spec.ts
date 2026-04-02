import { expect, test } from "@playwright/test";
import { createWebsite, mockSiteUrl, openWebsiteDetail, registerAccount, registerAndSubscribe, selectWebsite, startSubscription, uniqueName, waitForPost } from "./helpers";

test("core app workflow runs from website creation to export and automation", async ({ page }, testInfo) => {
  const websiteName = uniqueName("Northstar", testInfo.project.name);
  await registerAndSubscribe(page);

  await createWebsite(page, {
    name: websiteName,
    domain: mockSiteUrl(testInfo.project.name, "simple"),
    niche: "Bookkeeping",
    tone: "Practical and reassuring",
    contentGoal: "Book consultations"
  });

  const detailUrl = await openWebsiteDetail(page, websiteName);

  const analysisRequest = waitForPost(page, "/analyze");
  await page.getByTestId("analyze-website-button").click();
  await analysisRequest;
  await expect(page.getByText("Analysis confidence")).toBeVisible({ timeout: 30_000 });

  const opportunitiesRequest = waitForPost(page, "/generate-opportunities");
  await page.getByTestId("generate-opportunities-button").click();
  await opportunitiesRequest;

  await page.goto("/app/opportunities");
  await selectWebsite(page, "Website", websiteName);
  const firstOpportunityRow = page.locator('[aria-label="Opportunity queue"] tbody tr').first();
  await expect(firstOpportunityRow).toBeVisible({ timeout: 30_000 });

  const planRequest = waitForPost(page, "/generate-plan");
  await firstOpportunityRow.getByRole("button", { name: "Generate plan" }).click();
  await planRequest;
  await expect(page.getByText(/article plan/i)).toBeVisible();

  await page.goto("/app/plans");
  await selectWebsite(page, "Website filter", websiteName);
  const firstPlanRow = page.locator('[aria-label="Planning queue"] tbody tr').first();
  await expect(firstPlanRow).toBeVisible({ timeout: 30_000 });

  const draftRequest = waitForPost(page, "/generate-draft");
  await firstPlanRow.getByRole("button", { name: "Generate draft" }).click();
  await draftRequest;
  await expect(page.getByText(/draft/i).first()).toBeVisible();

  await page.goto("/app/drafts");
  await selectWebsite(page, "Website filter", websiteName);
  const firstDraftRow = page.locator('[aria-label="Draft queue"] tbody tr').first();
  await expect(firstDraftRow).toBeVisible({ timeout: 30_000 });

  const exportRequest = waitForPost(page, "/export");
  await firstDraftRow.getByRole("button", { name: "Export" }).click();
  await exportRequest;
  await expect(page.getByText(/export package|created an export/i).first()).toBeVisible();

  await page.goto("/app/exports");
  await selectWebsite(page, "Website filter", websiteName);
  await expect(page.locator('[aria-label="Export jobs"] tbody tr').first()).toBeVisible({ timeout: 30_000 });

  await page.goto(detailUrl);
  await page.getByTestId("run-automation-toggle").click();
  await expect(page.getByRole("heading", { name: "Automation" })).toBeVisible();
  const automationRequest = waitForPost(page, "/run-automation");
  await page.getByTestId("automation-submit-button").click();
  await automationRequest;
  await expect(page.locator(".state-card").filter({ hasText: /created|completed|refreshed|automation/i }).first()).toBeVisible({ timeout: 30_000 });

  await page.goto("/app/automation-runs");
  await selectWebsite(page, "Website filter", websiteName);
  await expect(page.locator('[aria-label="Automation runs"] tbody tr').first()).toBeVisible({ timeout: 30_000 });
});

test("friendly validation and low-confidence warnings are shown", async ({ page }, testInfo) => {
  await registerAndSubscribe(page);

  await createWebsite(page, {
    name: uniqueName("Broken URL Co", testInfo.project.name),
    domain: "notaurl",
    niche: "Consulting"
  }, { expectSuccess: false });

  await expect(page.getByText("Enter a valid website URL, including a real domain.")).toBeVisible();

  const weakWebsiteName = uniqueName("Apex Growth", testInfo.project.name);
  await createWebsite(page, {
    name: weakWebsiteName,
    domain: mockSiteUrl(testInfo.project.name, "weak"),
    niche: "Growth consulting",
    tone: "Direct",
    contentGoal: "Start discovery calls"
  });

  await openWebsiteDetail(page, weakWebsiteName);

  const analysisRequest = waitForPost(page, "/analyze");
  await page.getByTestId("analyze-website-button").click();
  await analysisRequest;

  await expect(page.getByText(/Low-confidence scan|Analysis confidence/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("generate-opportunities-button")).toBeDisabled();
});

test("unsubscribed users are sent to pricing and subscribed users can continue", async ({ page }) => {
  await registerAccount(page, "/pricing?next=/app/dashboard");

  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/pricing\?next=/);
  await expect(page.getByRole("heading", { name: "Autoblog Agent monthly" })).toBeVisible();

  await startSubscription(page, "/app/dashboard");
  await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
