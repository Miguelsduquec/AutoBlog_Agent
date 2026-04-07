import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config";
import { sessionRepository, subscriptionRepository, userRepository } from "../repositories/authRepository";
import { AuthResponse, AuthSnapshot, AuthUser, GoogleAuthInput, LoginInput, RegisterInput, Subscription, User, UserSession } from "../types";
import { HttpError } from "../utils/errors";
import { createId } from "../utils/ids";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

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
  return Boolean(subscription && subscription.status === "active");
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

function verifyPassword(password: string, passwordHash: string | null): boolean {
  const [salt, expected] = String(passwordHash ?? "").split(":");
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
      googleSub: "",
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
    if (!user) {
      throw new HttpError(401, "Incorrect email or password.", "invalid_credentials");
    }

    if (user.passwordHash == null) {
      throw new HttpError(409, "This account uses Google sign-in. Continue with Google to access it.", "google_login_required");
    }

    if (!verifyPassword(String(input.password ?? ""), user.passwordHash)) {
      throw new HttpError(401, "Incorrect email or password.", "invalid_credentials");
    }

    return this.createSessionResponse(user);
  }

  async loginWithGoogle(input: GoogleAuthInput): Promise<AuthResponse> {
    const identity = await this.resolveGoogleIdentity(input);
    const now = new Date().toISOString();

    const linkedUser = userRepository.getByGoogleSub(identity.googleSub);
    if (linkedUser) {
      const updated = linkedUser.name !== identity.name || linkedUser.email !== identity.email
        ? userRepository.update({
            ...linkedUser,
            email: identity.email,
            name: identity.name,
            updatedAt: now
          })
        : linkedUser;

      return this.createSessionResponse(updated);
    }

    const existingByEmail = userRepository.getByEmail(identity.email);
    if (existingByEmail) {
      if (existingByEmail.googleSub && existingByEmail.googleSub !== identity.googleSub) {
        throw new HttpError(409, "This Google account is already linked elsewhere.", "google_account_conflict");
      }

      const updated = userRepository.update({
        ...existingByEmail,
        name: existingByEmail.name || identity.name,
        googleSub: identity.googleSub,
        updatedAt: now
      });

      return this.createSessionResponse(updated);
    }

    const user: User = {
      id: createId("user"),
      email: identity.email,
      name: identity.name,
      passwordHash: null,
      googleSub: identity.googleSub,
      stripeCustomerId: "",
      createdAt: now,
      updatedAt: now
    };

    userRepository.create(user);
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

  private async resolveGoogleIdentity(input: GoogleAuthInput): Promise<{ email: string; name: string; googleSub: string }> {
    if (config.googleAuthMode === "mock") {
      const mockEmail = normalizeEmail(input.email || String(input.credential).replace(/^mock-google:/, ""));
      if (!EMAIL_PATTERN.test(mockEmail)) {
        throw new HttpError(400, "A valid Google email is required.", "invalid_google_email");
      }

      return {
        email: mockEmail,
        name: String(input.name ?? "Google User").trim() || "Google User",
        googleSub: `mock-google-sub:${mockEmail}`
      };
    }

    if (config.googleAuthMode !== "live" || !config.googleClientId || !googleClient) {
      throw new HttpError(503, "Google sign-in is not configured.", "google_auth_unavailable");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: String(input.credential ?? ""),
      audience: config.googleClientId
    });
    const payload = ticket.getPayload();

    const email = normalizeEmail(payload?.email ?? "");
    if (!payload?.sub || !payload?.email_verified || !EMAIL_PATTERN.test(email)) {
      throw new HttpError(401, "Google sign-in could not be verified.", "google_auth_invalid");
    }

    return {
      email,
      name: String(payload.name ?? "").trim() || email.split("@")[0],
      googleSub: String(payload.sub)
    };
  }
}
