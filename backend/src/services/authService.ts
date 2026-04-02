import crypto from "node:crypto";
import { sessionRepository, subscriptionRepository, userRepository } from "../repositories/authRepository";
import { AuthResponse, AuthSnapshot, AuthUser, LoginInput, RegisterInput, Subscription, User, UserSession } from "../types";
import { HttpError } from "../utils/errors";
import { createId } from "../utils/ids";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

function sanitizeUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function isActiveSubscription(subscription: Subscription | null): boolean {
  return Boolean(subscription && (subscription.status === "active" || subscription.status === "trialing"));
}

function buildSnapshot(user: User | null, subscription: Subscription | null): AuthSnapshot {
  return {
    isAuthenticated: Boolean(user),
    hasActiveSubscription: isActiveSubscription(subscription),
    user: sanitizeUser(user),
    subscription
  };
}

function validatePassword(password: string): string {
  const normalized = String(password ?? "");
  if (normalized.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, "Use a password with at least 8 characters.", "invalid_password");
  }

  return normalized;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, expected] = String(passwordHash).split(":");
  if (!salt || !expected) {
    return false;
  }

  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export class AuthService {
  getSession(sessionToken?: string): AuthSnapshot {
    if (!sessionToken) {
      return buildSnapshot(null, null);
    }

    const session = sessionRepository.getByToken(sessionToken);
    if (!session) {
      return buildSnapshot(null, null);
    }

    sessionRepository.touch(session.id, new Date().toISOString());
    const user = userRepository.getById(session.userId);
    if (!user) {
      return buildSnapshot(null, null);
    }

    return buildSnapshot(user, subscriptionRepository.getByUserId(user.id));
  }

  register(input: RegisterInput): AuthResponse {
    const email = normalizeEmail(input.email);
    if (!EMAIL_PATTERN.test(email)) {
      throw new HttpError(400, "Enter a valid email address.", "invalid_email");
    }

    if (userRepository.getByEmail(email)) {
      throw new HttpError(409, "An account already exists for this email.", "email_taken");
    }

    const now = new Date().toISOString();
    const user: User = {
      id: createId("user"),
      email,
      name: String(input.name ?? "").trim(),
      passwordHash: hashPassword(validatePassword(input.password)),
      stripeCustomerId: "",
      createdAt: now,
      updatedAt: now
    };

    userRepository.create(user);
    return this.createSessionResponse(user);
  }

  login(input: LoginInput): AuthResponse {
    const email = normalizeEmail(input.email);
    const user = userRepository.getByEmail(email);
    if (!user || !verifyPassword(String(input.password ?? ""), user.passwordHash)) {
      throw new HttpError(401, "Incorrect email or password.", "invalid_credentials");
    }

    return this.createSessionResponse(user);
  }

  logout(sessionToken?: string): void {
    if (!sessionToken) {
      return;
    }

    sessionRepository.deleteByToken(sessionToken);
  }

  requireUser(sessionToken?: string): User {
    const session = sessionToken ? sessionRepository.getByToken(sessionToken) : null;
    if (!session) {
      throw new HttpError(401, "Log in to continue.", "authentication_required");
    }

    sessionRepository.touch(session.id, new Date().toISOString());
    const user = userRepository.getById(session.userId);
    if (!user) {
      throw new HttpError(401, "Log in to continue.", "authentication_required");
    }

    return user;
  }

  requireActiveSubscription(sessionToken?: string): { user: User; subscription: Subscription } {
    const user = this.requireUser(sessionToken);
    const subscription = subscriptionRepository.getByUserId(user.id);
    if (!subscription || !isActiveSubscription(subscription)) {
      throw new HttpError(402, "Start a subscription to use Autoblog Agent.", "subscription_required");
    }

    return { user, subscription };
  }

  getSubscriptionForUser(userId: string): Subscription | null {
    return subscriptionRepository.getByUserId(userId);
  }

  updateStripeCustomerId(userId: string, stripeCustomerId: string): User {
    const user = userRepository.getById(userId);
    if (!user) {
      throw new HttpError(404, "User not found.", "user_not_found");
    }

    const updated: User = {
      ...user,
      stripeCustomerId,
      updatedAt: new Date().toISOString()
    };

    return userRepository.update(updated);
  }

  private createSessionResponse(user: User): AuthResponse {
    const now = new Date().toISOString();
    const session: UserSession = {
      id: createId("session"),
      userId: user.id,
      token: createSessionToken(),
      createdAt: now,
      lastSeenAt: now
    };

    sessionRepository.create(session);

    return {
      sessionToken: session.token,
      session: buildSnapshot(user, subscriptionRepository.getByUserId(user.id))
    };
  }
}
