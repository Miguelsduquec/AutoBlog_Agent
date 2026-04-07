import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { db } from "../../src/db/database";
import { authHeaders, googleLoginUser, loginUser, registerAndSubscribeUser, registerUser, TEST_PASSWORD } from "../helpers/auth";
import { invokeApp } from "../helpers/invokeApp";

const app = createApp({ seed: false });

describe("Auth and billing API", () => {
  it("registers, logs in, and logs out with a persisted session", async () => {
    const email = `auth-${Date.now()}@example.com`;
    const registration = await registerUser(app, email);

    expect(registration.response.status).toBe(201);
    expect(registration.sessionToken.length).toBeGreaterThan(20);
    expect((registration.response.body as any).session.isAuthenticated).toBe(true);
    expect((registration.response.body as any).session.hasActiveSubscription).toBe(false);

    const sessionResponse = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });

    expect(sessionResponse.status).toBe(200);
    expect((sessionResponse.body as any).isAuthenticated).toBe(true);
    expect((sessionResponse.body as any).user.email).toBe(email);

    const login = await loginUser(app, email, TEST_PASSWORD);
    expect(login.response.status).toBe(200);
    expect((login.response.body as any).session.user.email).toBe(email);

    const storedUser = db
      .prepare("SELECT email, password_hash, google_sub FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .get(email) as { email: string; password_hash: string; google_sub: string } | undefined;

    expect(storedUser?.email).toBe(email);
    expect(storedUser?.password_hash).not.toBe(TEST_PASSWORD);
    expect(storedUser?.password_hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    expect(storedUser?.google_sub).toBe("");

    const logoutResponse = await invokeApp(app, {
      method: "POST",
      url: "/api/auth/logout",
      headers: authHeaders(login.sessionToken)
    });

    expect(logoutResponse.status).toBe(204);
  });

  it("supports Google sign-in, links an existing account by email, and preserves subscription access", async () => {
    const email = `google-link-${Date.now()}@example.com`;
    const existing = await registerAndSubscribeUser(app, email);

    const googleLogin = await googleLoginUser(app, email, "Linked Google User");
    expect(googleLogin.response.status).toBe(200);
    expect((googleLogin.response.body as any).session.user.email).toBe(email);
    expect((googleLogin.response.body as any).session.hasActiveSubscription).toBe(true);

    const storedUser = db
      .prepare("SELECT email, password_hash, google_sub FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .get(email) as { email: string; password_hash: string; google_sub: string } | undefined;

    expect(storedUser?.password_hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    expect(storedUser?.google_sub).toBe(`mock-google-sub:${email}`);

    const session = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(googleLogin.sessionToken)
    });

    expect(session.status).toBe(200);
    expect((session.body as any).hasActiveSubscription).toBe(true);
    expect((session.body as any).subscription.status).toBe("active");

    const passwordLogin = await loginUser(app, email, TEST_PASSWORD);
    expect(passwordLogin.response.status).toBe(200);
    expect(existing.checkout.status).toBe(201);
  });

  it("creates Google-only accounts without storing a local password hash and blocks password login for them", async () => {
    const email = `google-only-${Date.now()}@example.com`;
    const googleLogin = await googleLoginUser(app, email, "Google Only User");

    expect(googleLogin.response.status).toBe(200);
    expect((googleLogin.response.body as any).session.user.email).toBe(email);

    const storedUser = db
      .prepare("SELECT password_hash, google_sub FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .get(email) as { password_hash: string | null; google_sub: string } | undefined;

    expect(storedUser?.password_hash).toBeNull();
    expect(storedUser?.google_sub).toBe(`mock-google-sub:${email}`);

    const passwordLogin = await invokeApp(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email,
        password: TEST_PASSWORD
      }
    });

    expect(passwordLogin.status).toBe(409);
    expect((passwordLogin.body as any).code).toBe("google_login_required");
  });

  it("creates a checkout session for an authenticated user", async () => {
    const registration = await registerUser(app, `billing-${Date.now()}@example.com`);

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/create-checkout-session",
      headers: authHeaders(registration.sessionToken)
    });

    expect(response.status).toBe(201);
    expect((response.body as any).id).toMatch(/^cs_/);
    expect((response.body as any).url).toContain("/pricing");

    const session = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });

    expect((session.body as any).hasActiveSubscription).toBe(true);
    expect((session.body as any).subscription.status).toBe("active");
    expect((response.body as any).plan).toBe("monthly");
    expect((response.body as any).priceId).toBeTruthy();
  });

  it("creates a yearly checkout session when the annual plan is selected", async () => {
    const registration = await registerUser(app, `billing-yearly-${Date.now()}@example.com`);

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/create-checkout-session",
      headers: authHeaders(registration.sessionToken),
      body: {
        plan: "yearly"
      }
    });

    expect(response.status).toBe(201);
    expect((response.body as any).plan).toBe("yearly");
    expect((response.body as any).priceId).toBeTruthy();

    const subscription = db
      .prepare("SELECT stripe_price_id, status FROM subscriptions WHERE user_id = (SELECT user_id FROM user_sessions WHERE token = ? LIMIT 1)")
      .get(registration.sessionToken) as { stripe_price_id: string; status: string } | undefined;

    expect(subscription?.stripe_price_id).toBe((response.body as any).priceId);
    expect(subscription?.status).toBe("active");
  });

  it("rejects invalid billing plans", async () => {
    const registration = await registerUser(app, `billing-invalid-${Date.now()}@example.com`);

    const response = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/create-checkout-session",
      headers: authHeaders(registration.sessionToken),
      body: {
        plan: "weekly"
      }
    });

    expect(response.status).toBe(400);
    expect((response.body as any).code).toBe("invalid_billing_plan");
  });

  it("updates subscription status through the webhook handler", async () => {
    const registration = await registerAndSubscribeUser(app, `webhook-${Date.now()}@example.com`);
    const checkoutSessionId = (registration.checkout.body as any).id as string;
    const currentSession = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });
    const userId = (currentSession.body as any).user.id as string;

    const deactivated = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/webhook",
      body: {
        type: "subscription.deleted",
        data: {
          object: {
            id: `sub_cancel_${Date.now()}`,
            customer: `cus_cancel_${Date.now()}`,
            status: "canceled",
            metadata: {
              userId
            }
          }
        }
      }
    });

    expect(deactivated.status).toBe(200);

    const inactiveSession = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });

    expect((inactiveSession.body as any).hasActiveSubscription).toBe(false);
    expect((inactiveSession.body as any).subscription.status).toBe("canceled");

    const activated = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/webhook",
      body: {
        type: "checkout.session.completed",
        data: {
          object: {
            id: checkoutSessionId,
            customer: `cus_restore_${Date.now()}`,
            subscription: `sub_restore_${Date.now()}`,
            metadata: {
              userId
            }
          }
        }
      }
    });

    expect(activated.status).toBe(200);

    const activeSession = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });

    expect((activeSession.body as any).hasActiveSubscription).toBe(true);
    expect((activeSession.body as any).subscription.status).toBe("active");
  });

  it("updates period end and subscription metadata from invoice and subscription webhooks", async () => {
    const registration = await registerAndSubscribeUser(app, `webhook-period-${Date.now()}@example.com`);
    const session = await invokeApp(app, {
      method: "GET",
      url: "/api/auth/session",
      headers: authHeaders(registration.sessionToken)
    });
    const userId = (session.body as any).user.id as string;
    const currentSubscriptionId = (session.body as any).subscription.stripeSubscriptionId as string;
    const yearlyPriceId = "price_test_yearly";
    const periodEndUnix = Math.floor(Date.now() / 1000) + 86400 * 365;

    const invoicePaid = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/webhook",
      body: {
        type: "invoice.paid",
        data: {
          object: {
            customer: `cus_invoice_${Date.now()}`,
            subscription: currentSubscriptionId,
            lines: {
              data: [
                {
                  period: {
                    end: periodEndUnix
                  }
                }
              ]
            }
          }
        }
      }
    });

    expect(invoicePaid.status).toBe(200);

    const updated = await invokeApp(app, {
      method: "POST",
      url: "/api/billing/webhook",
      body: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: currentSubscriptionId,
            customer: `cus_invoice_${Date.now()}`,
            status: "past_due",
            current_period_end: periodEndUnix,
            metadata: {
              userId
            },
            items: {
              data: [
                {
                  price: {
                    id: yearlyPriceId
                  }
                }
              ]
            }
          }
        }
      }
    });

    expect(updated.status).toBe(200);

    const subscriptionRow = db
      .prepare("SELECT stripe_price_id, status, current_period_end FROM subscriptions WHERE user_id = ? LIMIT 1")
      .get(userId) as { stripe_price_id: string; status: string; current_period_end: string } | undefined;
    const userRow = db
      .prepare("SELECT stripe_customer_id FROM users WHERE id = ? LIMIT 1")
      .get(userId) as { stripe_customer_id: string } | undefined;

    expect(subscriptionRow?.stripe_price_id).toBe(yearlyPriceId);
    expect(subscriptionRow?.status).toBe("past_due");
    expect(subscriptionRow?.current_period_end).toBe(new Date(periodEndUnix * 1000).toISOString());
    expect(userRow?.stripe_customer_id).toMatch(/^cus_invoice_/);
  });

  it("blocks unsubscribed users and allows subscribed users into paid app routes", async () => {
    const unsubscribed = await registerUser(app, `gate-${Date.now()}@example.com`);

    const blocked = await invokeApp(app, {
      method: "POST",
      url: "/api/websites",
      headers: authHeaders(unsubscribed.sessionToken),
      body: {
        name: "Blocked Site",
        domain: "https://blocked-site.example.com",
        language: "English",
        targetCountry: "United States",
        niche: "Consulting",
        tone: "Direct",
        contentGoal: "Generate leads",
        publishingFrequency: "Weekly"
      }
    });

    expect(blocked.status).toBe(402);
    expect((blocked.body as any).code).toBe("subscription_required");

    const subscribed = await registerAndSubscribeUser(app, `allowed-${Date.now()}@example.com`);
    const allowed = await invokeApp(app, {
      method: "POST",
      url: "/api/websites",
      headers: authHeaders(subscribed.sessionToken),
      body: {
        name: "Allowed Site",
        domain: `https://allowed-${Date.now()}.example.com`,
        language: "English",
        targetCountry: "United States",
        niche: "Consulting",
        tone: "Direct",
        contentGoal: "Generate leads",
        publishingFrequency: "Weekly"
      }
    });

    expect(allowed.status).toBe(201);
    expect((allowed.body as any).name).toBe("Allowed Site");
  });
});
