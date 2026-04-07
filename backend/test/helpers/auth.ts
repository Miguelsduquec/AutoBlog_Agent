import { Express } from "express";
import { invokeApp } from "./invokeApp";

export const TEST_PASSWORD = "Password123!";

export function authHeaders(sessionToken: string): Record<string, string> {
  return {
    authorization: `Bearer ${sessionToken}`
  };
}

export async function registerUser(app: Express, email = `user-${Date.now()}@example.com`) {
  const response = await invokeApp(app, {
    method: "POST",
    url: "/api/auth/register",
    body: {
      email,
      name: "Test User",
      password: TEST_PASSWORD
    }
  });

  return {
    email,
    password: TEST_PASSWORD,
    response,
    sessionToken: (response.body as any).sessionToken as string
  };
}

export async function loginUser(app: Express, email: string, password = TEST_PASSWORD) {
  const response = await invokeApp(app, {
    method: "POST",
    url: "/api/auth/login",
    body: {
      email,
      password
    }
  });

  return {
    response,
    sessionToken: (response.body as any).sessionToken as string
  };
}

export async function googleLoginUser(
  app: Express,
  email = `google-${Date.now()}@example.com`,
  name = "Google User"
) {
  const response = await invokeApp(app, {
    method: "POST",
    url: "/api/auth/google",
    body: {
      credential: `mock-google:${email}`,
      email,
      name
    }
  });

  return {
    email,
    response,
    sessionToken: (response.body as any).sessionToken as string
  };
}

export async function subscribeUser(app: Express, sessionToken: string) {
  return invokeApp(app, {
    method: "POST",
    url: "/api/billing/create-checkout-session",
    headers: authHeaders(sessionToken)
  });
}

export async function registerAndSubscribeUser(app: Express, email = `subscribed-${Date.now()}@example.com`) {
  const registration = await registerUser(app, email);
  const checkout = await subscribeUser(app, registration.sessionToken);

  return {
    ...registration,
    checkout
  };
}
