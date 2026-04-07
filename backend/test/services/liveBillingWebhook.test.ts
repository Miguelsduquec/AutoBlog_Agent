import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  BILLING_MODE: process.env.BILLING_MODE,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
};

afterEach(() => {
  process.env.BILLING_MODE = originalEnv.BILLING_MODE;
  process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = originalEnv.STRIPE_WEBHOOK_SECRET;
  vi.resetModules();
});

describe("Live Stripe webhook handling", () => {
  it("returns a 400-style error when Stripe signature verification fails", async () => {
    process.env.BILLING_MODE = "stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

    vi.resetModules();
    const { BillingService } = await import("../../src/services/billingService");

    const service = new BillingService();

    await expect(
      service.handleWebhook(JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }), "invalid-signature")
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "invalid_webhook_signature"
    });
  });
});
