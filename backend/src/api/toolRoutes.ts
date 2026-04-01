import { Router } from "express";
import { ContentGapGraderService } from "../services/contentGapGraderService";
import { asyncHandler } from "./utils";

const router = Router();
const contentGapGraderService = new ContentGapGraderService();

router.post(
  "/content-gap-grader",
  asyncHandler(async (request, response) => {
    const url = String(request.body?.url ?? "").trim();
    if (!url) {
      response.status(400).json({ message: "Website URL is required." });
      return;
    }

    response.json(await contentGapGraderService.gradeWebsite(url));
  })
);

export const toolRoutes = router;
