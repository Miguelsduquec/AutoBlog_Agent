import { db } from "../db/database";
import { Subscription, User, UserSession } from "../types";
import { mapSubscription, mapUser, mapUserSession } from "./mappers";

export const userRepository = {
  getById(id: string): User | null {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  getByEmail(email: string): User | null {
    const row = db
      .prepare("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .get(email) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  getByGoogleSub(googleSub: string): User | null {
    const row = db
      .prepare("SELECT * FROM users WHERE google_sub = ? LIMIT 1")
      .get(googleSub) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  getByStripeCustomerId(stripeCustomerId: string): User | null {
    const row = db
      .prepare("SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1")
      .get(stripeCustomerId) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  create(user: User): User {
    db.prepare(`
      INSERT INTO users (
        id, email, name, password_hash, google_sub, stripe_customer_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.passwordHash,
      user.googleSub,
      user.stripeCustomerId,
      user.createdAt,
      user.updatedAt
    );

    return user;
  },

  update(user: User): User {
    db.prepare(`
      UPDATE users
      SET email = ?, name = ?, password_hash = ?, google_sub = ?, stripe_customer_id = ?, updated_at = ?
      WHERE id = ?
    `).run(user.email, user.name, user.passwordHash, user.googleSub, user.stripeCustomerId, user.updatedAt, user.id);

    return user;
  }
};

export const sessionRepository = {
  getByToken(token: string): UserSession | null {
    const row = db
      .prepare("SELECT * FROM user_sessions WHERE token = ? LIMIT 1")
      .get(token) as Record<string, unknown> | undefined;
    return row ? mapUserSession(row) : null;
  },

  create(session: UserSession): UserSession {
    db.prepare(`
      INSERT INTO user_sessions (
        id, user_id, token, created_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(session.id, session.userId, session.token, session.createdAt, session.lastSeenAt);

    return session;
  },

  touch(id: string, lastSeenAt: string): void {
    db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE id = ?").run(lastSeenAt, id);
  },

  deleteByToken(token: string): void {
    db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
  }
};

export const subscriptionRepository = {
  getByUserId(userId: string): Subscription | null {
    const row = db
      .prepare("SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1")
      .get(userId) as Record<string, unknown> | undefined;
    return row ? mapSubscription(row) : null;
  },

  getByStripeSubscriptionId(stripeSubscriptionId: string): Subscription | null {
    const row = db
      .prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1")
      .get(stripeSubscriptionId) as Record<string, unknown> | undefined;
    return row ? mapSubscription(row) : null;
  },

  getByCheckoutSessionId(checkoutSessionId: string): Subscription | null {
    const row = db
      .prepare("SELECT * FROM subscriptions WHERE stripe_checkout_session_id = ? LIMIT 1")
      .get(checkoutSessionId) as Record<string, unknown> | undefined;
    return row ? mapSubscription(row) : null;
  },

  getByStripeCustomerId(stripeCustomerId: string): Subscription | null {
    const row = db
      .prepare("SELECT * FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1")
      .get(stripeCustomerId) as Record<string, unknown> | undefined;
    return row ? mapSubscription(row) : null;
  },

  upsert(subscription: Subscription): Subscription {
    const existing = this.getByUserId(subscription.userId);

    if (existing) {
      db.prepare(`
        UPDATE subscriptions
        SET stripe_customer_id = ?, stripe_subscription_id = ?, stripe_price_id = ?, stripe_checkout_session_id = ?, status = ?, current_period_end = ?, updated_at = ?
        WHERE user_id = ?
      `).run(
        subscription.stripeCustomerId,
        subscription.stripeSubscriptionId,
        subscription.stripePriceId,
        subscription.stripeCheckoutSessionId,
        subscription.status,
        subscription.currentPeriodEnd,
        subscription.updatedAt,
        subscription.userId
      );

      return subscription;
    }

    db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id, status, current_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subscription.id,
      subscription.userId,
      subscription.stripeCustomerId,
      subscription.stripeSubscriptionId,
      subscription.stripePriceId,
      subscription.stripeCheckoutSessionId,
      subscription.status,
      subscription.currentPeriodEnd,
      subscription.createdAt,
      subscription.updatedAt
    );

    return subscription;
  }
};
