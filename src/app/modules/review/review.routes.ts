import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { reviewController } from "./review.controller.js";
import { createReviewZod } from "./review.validation.js";

const router = Router();

router.post(
  "/",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  validate(createReviewZod),
  reviewController.create
);

router.get("/:authId/summary", reviewController.getSummary);

router.get("/:authId", reviewController.getAllByUser);

export const reviewRoutes = router;
