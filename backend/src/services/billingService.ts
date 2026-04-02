import Stripe from "stripe";
import { config } from "../config";
import { subscriptionRepository, userRepository } from "../repositories/authRepository";
import { BillingCheckoutSession, Subscription, SubscriptionStatus, User } from "../types";
import { HttpError } from "../utils/errors";
import { createId } from "../utils/ids";

type WebhookEnvelope = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function toIsoFromUnix(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString();
  }

  return "";
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const normalized = String(value ?? "inactive").toLowerCase();
  if (normalized === "trialing" || normalized === "active" || normalized === "past_due" || normalized === "canceled" || normalized === "unpaid") {
    return normalized;
  }

  return "inactive";
}

function readPriceId(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string" ? record.id : "";
}

export class BillingService {
  private readonly stripe =
    config.billingMode === "stripe" && config.stripeSecretKey
      ? new Stripe(config.stripeSecretKey, {
          apiVersion: "2026-03-25.dahlia"
        })
      : null;

  async createCheckoutSession(user: User): Promise<BillingCheckoutSession> {
    if (this.stripe) {
      if (!config.stripePriceId) {
        throw new HttpError(500, "STRIPE_PRICE_ID is missing.", "stripe_config_missing");
      }

      const customerId = await this.ensureStripeCustomer(user);
      const session = await this.stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: config.stripePriceId,
            quantity: 1
          }
        ],
        success_url: `${config.appUrl}/pricing?checkout=success`,
        cancel_url: `${config.appUrl}/pricing?checkout=cancelled`,
        allow_promotion_codes: true,
        metadata: {
          userId: user.id
        },
        subscription_data: {
          metadata: {
            userId: user.id
          }
        }
      });

      this.upsertSubscription({
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: "",
        stripePriceId: config.stripePriceId,
        stripeCheckoutSessionId: session.id,
        status: "inactive",
        currentPeriodEnd: ""
      });

      return {
        id: session.id,
        url: session.url ?? `${config.appUrl}/pricing?checkout=created`
      };
    }

    const mockSessionId = `cs_mock_${createId("checkout")}`;
    const mockSubscriptionId = `sub_mock_${user.id}`;
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    this.upsertSubscription({
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId || `cus_mock_${user.id}`,
      stripeSubscriptionId: mockSubscriptionId,
      stripePriceId: config.stripePriceId || "price_mock_monthly",
      stripeCheckoutSessionId: mockSessionId,
      status: "active",
      currentPeriodEnd
    });

    return {
      id: mockSessionId,
      url: `${config.appUrl}/pricing?checkout=success&mock=1`
    };
  }

  async handleWebhook(rawBody: Buffer | string, signature?: string): Promise<{ received: true }> {
    const event = this.stripe && config.stripeWebhookSecret && signature
      ? this.stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret)
      : (typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"))) as WebhookEnvelope;

    await this.applyEvent(event.type, event.data.object as Record<string, unknown>);
    return { received: true };
  }

  private async applyEvent(type: string, object: Record<string, unknown>) {
    const normalizedType =
      type === "subscription.updated"
        ? "customer.subscription.updated"
        : type === "subscription.deleted"
          ? "customer.subscription.deleted"
          : type;

    if (normalizedType === "checkout.session.completed") {
      this.handleCheckoutCompleted(object);
      return;
    }

    if (normalizedType === "invoice.paid") {
      this.handleInvoicePaid(object);
      return;
    }

    if (normalizedType === "customer.subscription.updated" || normalizedType === "customer.subscription.deleted") {
      this.handleSubscriptionUpdated(object, normalizedType === "customer.subscription.deleted");
    }
  }

  private handleCheckoutCompleted(object: Record<string, unknown>) {
    const userId =
      typeof object.metadata === "object" && object.metadata && typeof (object.metadata as Record<string, unknown>).userId === "string"
        ? String((object.metadata as Record<string, unknown>).userId)
        : this.findUserIdFromEvent(object);

    if (!userId) {
      return;
    }

    this.upsertSubscription({
      userId,
      stripeCustomerId: String(object.customer ?? ""),
      stripeSubscriptionId: String(object.subscription ?? ""),
      stripePriceId: config.stripePriceId || "",
      stripeCheckoutSessionId: String(object.id ?? ""),
      status: "active",
      currentPeriodEnd: ""
    });
  }

  private handleInvoicePaid(object: Record<string, unknown>) {
    const userId = this.findUserIdFromEvent(object);
    if (!userId) {
      return;
    }

    const existing = subscriptionRepository.getByUserId(userId);
    this.upsertSubscription({
      userId,
      stripeCustomerId: String(object.customer ?? existing?.stripeCustomerId ?? ""),
      stripeSubscriptionId: String(object.subscription ?? existing?.stripeSubscriptionId ?? ""),
      stripePriceId: existing?.stripePriceId ?? "",
      stripeCheckoutSessionId: existing?.stripeCheckoutSessionId ?? "",
      status: "active",
      currentPeriodEnd: existing?.currentPeriodEnd ?? ""
    });
  }

  private handleSubscriptionUpdated(object: Record<string, unknown>, deleted: boolean) {
    const userId =
      typeof object.metadata === "object" && object.metadata && typeof (object.metadata as Record<string, unknown>).userId === "string"
        ? String((object.metadata as Record<string, unknown>).userId)
        : this.findUserIdFromEvent(object);

    if (!userId) {
      return;
    }

    const items = object.items as Record<string, unknown> | undefined;
    const itemData = Array.isArray(items?.data) ? (items?.data?.[0] as Record<string, unknown> | undefined) : undefined;
    const price = itemData?.price;
    const existing = subscriptionRepository.getByUserId(userId);

    this.upsertSubscription({
      userId,
      stripeCustomerId: String(object.customer ?? existing?.stripeCustomerId ?? ""),
      stripeSubscriptionId: String(object.id ?? existing?.stripeSubscriptionId ?? ""),
      stripePriceId: readPriceId(price) || existing?.stripePriceId || "",
      stripeCheckoutSessionId: existing?.stripeCheckoutSessionId ?? "",
      status: deleted ? "canceled" : normalizeSubscriptionStatus(object.status),
      currentPeriodEnd: toIsoFromUnix(object.current_period_end) || existing?.currentPeriodEnd || ""
    });
  }

  private findUserIdFromEvent(object: Record<string, unknown>): string {
    const subscriptionId = String(object.subscription ?? object.id ?? "");
    if (subscriptionId) {
      const existing = subscriptionRepository.getByStripeSubscriptionId(subscriptionId);
      if (existing) {
        return existing.userId;
      }
    }

    const checkoutSessionId = String(object.id ?? "");
    if (checkoutSessionId) {
      const fromCheckout = subscriptionRepository.getByCheckoutSessionId(checkoutSessionId);
      if (fromCheckout) {
        return fromCheckout.userId;
      }
    }

    const stripeCustomerId = String(object.customer ?? "");
    if (stripeCustomerId) {
      const fromCustomer = subscriptionRepository.getByStripeCustomerId(stripeCustomerId);
      if (fromCustomer) {
        return fromCustomer.userId;
      }

      const user = userRepository.getByStripeCustomerId(stripeCustomerId);
      if (user) {
        return user.id;
      }
    }

    return "";
  }

  private upsertSubscription(input: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    stripeCheckoutSessionId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
  }): Subscription {
    const now = new Date().toISOString();
    const existing = subscriptionRepository.getByUserId(input.userId);

    const next: Subscription = {
      id: existing?.id ?? createId("sub"),
      userId: input.userId,
      stripeCustomerId: input.stripeCustomerId || existing?.stripeCustomerId || "",
      stripeSubscriptionId: input.stripeSubscriptionId || existing?.stripeSubscriptionId || "",
      stripePriceId: input.stripePriceId || existing?.stripePriceId || "",
      stripeCheckoutSessionId: input.stripeCheckoutSessionId || existing?.stripeCheckoutSessionId || "",
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd || existing?.currentPeriodEnd || "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    return subscriptionRepository.upsert(next);
  }

  private async ensureStripeCustomer(user: User): Promise<string> {
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    if (!this.stripe) {
      return `cus_mock_${user.id}`;
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id
      }
    });

    userRepository.update({
      ...user,
      stripeCustomerId: customer.id,
      updatedAt: new Date().toISOString()
    });

    return customer.id;
  }
}
