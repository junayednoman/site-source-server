import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { bookmarkController } from "./bookmark.controller.js";
import {
  createJobBookmarkZod,
  createWorkerBookmarkZod,
} from "./bookmark.validation.js";

const router = Router();

router.post(
  "/jobs",
  authorize(UserRole.WORKER),
  validate(createJobBookmarkZod),
  bookmarkController.createJobBookmark
);

router.get(
  "/jobs",
  authorize(UserRole.WORKER),
  bookmarkController.getJobBookmarks
);

router.post(
  "/workers",
  authorize(UserRole.EMPLOYER),
  validate(createWorkerBookmarkZod),
  bookmarkController.createWorkerBookmark
);

router.get(
  "/workers",
  authorize(UserRole.EMPLOYER),
  bookmarkController.getWorkerBookmarks
);

export const bookmarkRoutes = router;
