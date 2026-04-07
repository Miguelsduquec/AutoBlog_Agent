import Stripe from "stripe";
import { config } from "../config";
import { subscriptionRepository, userRepository } from "../repositories/authRepository";
import { BillingCheckoutInput, BillingCheckoutSession, BillingPlan, Subscription, SubscriptionStatus, User } from "../types";
import { HttpError } from "../utils/errors";
import { createId } from "../utils/ids";

type WebhookEnvelope = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function readMetadata(object: Record<string, unknown>): Record<string, unknown> | undefined {
  return typeof object.metadata === "object" && object.metadata ? (object.metadata as Record<string, unknown>) : undefined;
}

function toIsoFromUnix(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString();
  }

  return "";
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const normalized = String(value ?? "inactive").toLowerCase();
  if (normalized === "trialing") {
    return "active";
  }

  if (normalized === "active" || normalized === "past_due" || normalized === "canceled" || normalized === "unpaid") {
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

function parseBillingPlan(value: unknown): BillingPlan {
  if (value == null || value === "") {
    return "monthly";
  }

  const normalized = String(value).toLowerCase();
  if (normalized === "monthly" || normalized === "yearly") {
    return normalized;
  }

  throw new HttpError(400, "Select a valid billing plan.", "invalid_billing_plan");
}

function readPeriodEndFromInvoice(object: Record<string, unknown>): string {
  const lines = object.lines as Record<string, unknown> | undefined;
  const firstLine = Array.isArray(lines?.data) ? (lines.data[0] as Record<string, unknown> | undefined) : undefined;
  const period = firstLine?.period as Record<string, unknown> | undefined;
  return toIsoFromUnix(period?.end ?? object.period_end);
}

export class BillingService {
  private readonly stripe =
    config.billingMode === "stripe" && config.stripeSecretKey
      ? new Stripe(config.stripeSecretKey, {
          apiVersion: "2026-03-25.dahlia"
        })
      : null;

  async createCheckoutSession(user: User, input: BillingCheckoutInput = {}): Promise<BillingCheckoutSession> {
    const plan = parseBillingPlan(input.plan);
    const priceId = this.resolvePriceId(plan);

    if (this.stripe) {
      const customerId = await this.ensureStripeCustomer(user);
      const session = await this.stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: `${config.stripeCheckoutSuccessUrl}${config.stripeCheckoutSuccessUrl.includes("?") ? "&" : "?"}plan=${plan}`,
        cancel_url: `${config.stripeCheckoutCancelUrl}${config.stripeCheckoutCancelUrl.includes("?") ? "&" : "?"}plan=${plan}`,
        allow_promotion_codes: true,
        metadata: {
          userId: user.id,
          email: user.email,
          selectedPlan: plan
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            email: user.email,
            selectedPlan: plan
          }
        }
      });

      this.upsertSubscription({
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: "",
        stripePriceId: priceId,
        stripeCheckoutSessionId: session.id,
        status: "inactive",
        currentPeriodEnd: ""
      });

      return {
        id: session.id,
        url: session.url ?? `${config.appUrl}/pricing?checkout=created&plan=${plan}`,
        plan,
        priceId
      };
    }

    const mockSessionId = `cs_mock_${createId("checkout")}`;
    const mockSubscriptionId = `sub_mock_${user.id}`;
    const currentPeriodEnd = new Date(
      Date.now() + (plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    this.upsertSubscription({
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId || `cus_mock_${user.id}`,
      stripeSubscriptionId: mockSubscriptionId,
      stripePriceId: priceId,
      stripeCheckoutSessionId: mockSessionId,
      status: "active",
      currentPeriodEnd
    });

    return {
      id: mockSessionId,
      url: `${config.appUrl}/pricing?checkout=success&mock=1&plan=${plan}`,
      plan,
      priceId
    };
  }

  async handleWebhook(rawBody: Buffer | string, signature?: string): Promise<{ received: true }> {
    let event: Stripe.Event | WebhookEnvelope;

    if (config.billingMode === "stripe") {
      if (!this.stripe || !config.stripeWebhookSecret) {
        throw new HttpError(500, "Stripe webhook configuration is incomplete.", "stripe_config_missing");
      }

      if (!signature) {
        throw new HttpError(400, "Stripe webhook signature is missing.", "invalid_webhook_signature");
      }
    }

    try {
      event = this.stripe && config.stripeWebhookSecret && signature
        ? this.stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret)
        : (typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"))) as WebhookEnvelope;
    } catch {
      throw new HttpError(400, "Stripe webhook verification failed.", "invalid_webhook_signature");
    }

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
    const metadata = readMetadata(object);
    const userId =
      metadata && typeof metadata.userId === "string"
        ? String(metadata.userId)
        : this.findUserIdFromEvent(object);

    if (!userId) {
      return;
    }

    const existing = subscriptionRepository.getByUserId(userId);
    const plan = parseBillingPlan(metadata?.selectedPlan);
    const stripeCustomerId = String(object.customer ?? existing?.stripeCustomerId ?? "");
    this.syncUserStripeCustomerId(userId, stripeCustomerId);

    this.upsertSubscription({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: String(object.subscription ?? ""),
      stripePriceId: existing?.stripePriceId || this.resolvePriceId(plan),
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
    const stripeCustomerId = String(object.customer ?? existing?.stripeCustomerId ?? "");
    this.syncUserStripeCustomerId(userId, stripeCustomerId);
    this.upsertSubscription({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: String(object.subscription ?? existing?.stripeSubscriptionId ?? ""),
      stripePriceId: existing?.stripePriceId ?? "",
      stripeCheckoutSessionId: existing?.stripeCheckoutSessionId ?? "",
      status: "active",
      currentPeriodEnd: readPeriodEndFromInvoice(object) || (existing?.currentPeriodEnd ?? "")
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
    const stripeCustomerId = String(object.customer ?? existing?.stripeCustomerId ?? "");
    this.syncUserStripeCustomerId(userId, stripeCustomerId);

    this.upsertSubscription({
      userId,
      stripeCustomerId,
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

  private resolvePriceId(plan: BillingPlan): string {
    const monthly = config.stripePriceIdMonthly || config.stripePriceId;
    const yearly = config.stripePriceIdYearly;

    if (this.stripe) {
      const selected = plan === "yearly" ? yearly : monthly;
      if (!selected) {
        throw new HttpError(
          500,
          plan === "yearly" ? "STRIPE_PRICE_ID_YEARLY is missing." : "STRIPE_PRICE_ID_MONTHLY is missing.",
          "stripe_config_missing"
        );
      }

      return selected;
    }

    if (config.billingMode === "stripe") {
      throw new HttpError(500, "Stripe billing is enabled but STRIPE_SECRET_KEY is missing.", "stripe_config_missing");
    }

    if (plan === "yearly") {
      return yearly || "price_mock_yearly";
    }

    return monthly || "price_mock_monthly";
  }

  private syncUserStripeCustomerId(userId: string, stripeCustomerId: string): void {
    if (!stripeCustomerId) {
      return;
    }

    const user = userRepository.getById(userId);
    if (!user || user.stripeCustomerId === stripeCustomerId) {
      return;
    }

    userRepository.update({
      ...user,
      stripeCustomerId,
      updatedAt: new Date().toISOString()
    });
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
