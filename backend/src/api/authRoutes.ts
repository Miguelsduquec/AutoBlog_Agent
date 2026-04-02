import { Router } from "express";
import { AuthService } from "../services/authService";
import { readSessionToken } from "./utils";

const router = Router();
const authService = new AuthService();

router.get("/auth/session", (request, response) => {
  response.json(authService.getSession(readSessionToken(request)));
});

router.post("/auth/register", (request, response) => {
  response.status(201).json(authService.register(request.body ?? {}));
});

router.post("/auth/login", (request, response) => {
  response.json(authService.login(request.body ?? {}));
});

router.post("/auth/logout", (request, response) => {
  authService.logout(readSessionToken(request));
  response.status(204).send();
});

export const authRoutes = router;
