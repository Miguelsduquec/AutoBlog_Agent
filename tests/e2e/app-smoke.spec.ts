import { expect, test } from "@playwright/test";
import { loginAccount, registerAndSubscribe, registerWithGoogle, startSubscription } from "./helpers";

test("dashboard and websites page load behind auth and subscription", async ({ page }) => {
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);

  const account = await registerAndSubscribe(page);
  await page.goto("/app/dashboard");
  await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/Subscription active/i)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);

  await loginAccount(page, account.email, account.password, "/app/websites");
  await expect(page.locator("main").getByRole("heading", { name: "Websites", exact: true })).toBeVisible();
  await expect(page.getByTestId("website-form")).toBeVisible();
});

test("mobile app navigation opens cleanly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This interaction is only relevant on the mobile project.");

  await registerAndSubscribe(page);
  await page.goto("/app/dashboard");
  const toggle = page.getByTestId("app-nav-toggle");

  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator(".sidebar.open")).toBeVisible();
  await page.getByTestId("sidebar-close-button").click();
  await expect(page.locator(".sidebar.open")).toHaveCount(0);
});

test("Google sign-in is available and can reach the paid app after checkout", async ({ page }) => {
  await registerWithGoogle(page, "/pricing?next=/app/dashboard");
  await expect(page.getByRole("heading", { name: "Paid subscription only" })).toBeVisible();
  await startSubscription(page, "/app/dashboard");
  await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByTestId("google-auth-button")).toBeVisible();
});
