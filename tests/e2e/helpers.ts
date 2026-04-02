import { expect, Page } from "@playwright/test";

const TEST_PASSWORD = "Password123!";

type MockSiteType = "simple" | "contentHeavy" | "weak";

type WebsiteFormData = {
  name: string;
  domain: string;
  language?: string;
  targetCountry?: string;
  niche?: string;
  tone?: string;
  contentGoal?: string;
  publishingFrequency?: string;
};

type CreateWebsiteOptions = {
  expectSuccess?: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function uniqueName(prefix: string, projectName: string): string {
  const token = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${prefix} ${token} ${Date.now()}`;
}

export function mockSiteUrl(projectName: string, siteType: MockSiteType): string {
  const basePort =
    projectName === "tablet-chromium" ? 4020 : projectName === "mobile-chromium" ? 4030 : 4010;
  const offset = siteType === "contentHeavy" ? 1 : siteType === "weak" ? 2 : 0;
  return `http://127.0.0.1:${basePort + offset}`;
}

export async function registerAccount(page: Page, next = "/pricing") {
  const email = `user-${Date.now()}-${Math.round(Math.random() * 1_000)}@example.com`;

  await page.goto(`/register?next=${encodeURIComponent(next)}`);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByLabel("Name").fill("Playwright User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(escapeRegExp(next)));

  return {
    email,
    password: TEST_PASSWORD
  };
}

export async function loginAccount(page: Page, email: string, password = TEST_PASSWORD, next = "/app/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(escapeRegExp(next)));
}

export async function startSubscription(page: Page, next = "/app/dashboard") {
  const checkoutRequest = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/billing/create-checkout-session") &&
      response.status() < 500
  );

  await page.getByRole("button", { name: "Start monthly subscription" }).click();
  await checkoutRequest;

  try {
    await expect(page).toHaveURL(new RegExp(escapeRegExp(next)), { timeout: 20_000 });
  } catch {
    if (page.url().includes("/pricing")) {
      await page.getByRole("button", { name: "Refresh status" }).click();
      await expect(page).toHaveURL(new RegExp(escapeRegExp(next)), { timeout: 20_000 });
    } else {
      throw new Error(`Expected checkout to continue to ${next}, but landed on ${page.url()}`);
    }
  }
}

export async function registerAndSubscribe(page: Page, next = "/app/dashboard") {
  const account = await registerAccount(page, `/pricing?next=${encodeURIComponent(next)}`);
  await startSubscription(page, next);
  return account;
}

export async function createWebsite(page: Page, data: WebsiteFormData, options: CreateWebsiteOptions = {}) {
  await page.goto("/app/websites");
  await expect(page.getByTestId("website-form")).toBeVisible();

  await page.getByLabel("Website name").fill(data.name);
  await page.getByLabel("Domain").fill(data.domain);
  await page.getByLabel("Language").fill(data.language ?? "English");
  await page.getByLabel("Target country").fill(data.targetCountry ?? "United States");
  await page.getByLabel("Niche or business type").fill(data.niche ?? "Operations consulting");
  await page.getByLabel("Brand tone").fill(data.tone ?? "Clear and practical");
  await page.getByLabel("Content goal").fill(data.contentGoal ?? "Generate qualified leads");

  if (data.publishingFrequency) {
    await page.getByLabel("Publishing frequency").selectOption({ label: data.publishingFrequency });
  }

  const request = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/api/websites")
  );

  await page.getByTestId("website-submit").click();
  await request;

  if (options.expectSuccess ?? true) {
    await expect(page.getByRole("link", { name: data.name, exact: true })).toBeVisible({ timeout: 20_000 });
  }
}

export async function openWebsiteDetail(page: Page, websiteName: string): Promise<string> {
  await page.goto("/app/websites");
  const websiteLink = page.getByRole("link", { name: websiteName, exact: true });
  await expect(websiteLink).toBeVisible({ timeout: 20_000 });
  await websiteLink.scrollIntoViewIfNeeded();
  await websiteLink.click();
  await expect(page.getByRole("heading", { name: websiteName, exact: true })).toBeVisible({ timeout: 20_000 });
  return page.url();
}

export async function selectWebsite(page: Page, label: string, websiteName: string) {
  const select = page.getByLabel(label);
  await expect(select).toBeVisible();
  await select.selectOption({ label: websiteName });
}

export function waitForPost(page: Page, pathFragment: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(pathFragment) &&
      response.status() < 500
  );
}
