import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/authService";

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}

export function readSessionToken(request: Request): string | undefined {
  const authorization = request.header("authorization");
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer") {
    return undefined;
  }

  const trimmed = token?.trim();
  return trimmed || undefined;
}

const authService = new AuthService();

export function requireAuthenticatedSession(request: Request, response: Response, next: NextFunction) {
  const user = authService.requireUser(readSessionToken(request));
  response.locals.currentUser = user;
  response.locals.currentSubscription = authService.getSubscriptionForUser(user.id);
  next();
}

export function requireActiveSubscription(request: Request, response: Response, next: NextFunction) {
  const { user, subscription } = authService.requireActiveSubscription(readSessionToken(request));
  response.locals.currentUser = user;
  response.locals.currentSubscription = subscription;
  next();
}
