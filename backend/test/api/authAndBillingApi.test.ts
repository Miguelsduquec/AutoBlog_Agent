import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { authHeaders, loginUser, registerAndSubscribeUser, registerUser, TEST_PASSWORD } from "../helpers/auth";
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

    const logoutResponse = await invokeApp(app, {
      method: "POST",
      url: "/api/auth/logout",
      headers: authHeaders(login.sessionToken)
    });

    expect(logoutResponse.status).toBe(204);
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
