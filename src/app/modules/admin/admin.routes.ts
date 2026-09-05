import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import { adminController } from "./admin.controller.js";
import { upload } from "../../utils/awss3.js";
import validate from "../../middlewares/validate.js";
import { profileUpdateZod, updateUserStatusZod } from "./admin.validation.js";

const router = Router();

router.get("/", authorize(UserRole.ADMIN), adminController.getDashboard);

router.get("/profile", authorize(UserRole.ADMIN), adminController.getProfile);

router.get("/users", authorize(UserRole.ADMIN), adminController.getAllUsers);

router.patch(
  "/users/:id/status",
  authorize(UserRole.ADMIN),
  validate(updateUserStatusZod),
  adminController.changeUserStatus
);

router.get("/jobs", authorize(UserRole.ADMIN), adminController.getAllJobs);

router.delete(
  "/jobs/:id",
  authorize(UserRole.ADMIN),
  adminController.deleteJob
);

router.get(
  "/supports",
  authorize(UserRole.ADMIN),
  adminController.getAllSupports
);

router.get(
  "/reviews",
  authorize(UserRole.ADMIN),
  adminController.getAllReviews
);

router.delete(
  "/reviews/:id",
  authorize(UserRole.ADMIN),
  adminController.deleteReview
);

router.patch(
  "/",
  authorize(UserRole.ADMIN),
  upload.single("image"),
  validate(profileUpdateZod, { formData: true }),
  adminController.updateProfile
);

export const adminRoutes = router;
