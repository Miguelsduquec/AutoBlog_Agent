import express, { Router } from "express";
import { BillingService } from "../services/billingService";
import { AuthService } from "../services/authService";
import { asyncHandler, readSessionToken } from "./utils";

const router = Router();
const billingService = new BillingService();
const authService = new AuthService();

router.post(
  "/billing/create-checkout-session",
  asyncHandler(async (request, response) => {
    const user = authService.requireUser(readSessionToken(request));
    response.status(201).json(await billingService.createCheckoutSession(user));
  })
);

export const billingWebhookMiddleware = express.raw({ type: "application/json" });

export const billingWebhookHandler = asyncHandler(async (request, response) => {
  const signature = request.header("stripe-signature");
  const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from(JSON.stringify(request.body ?? {}));
  response.json(await billingService.handleWebhook(rawBody, signature ?? undefined));
});

export const billingRoutes = router;
