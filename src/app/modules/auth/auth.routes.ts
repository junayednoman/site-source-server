import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  changeAccountStatusZod,
  changePasswordZod,
  loginZodSchema,
  resetPasswordZod,
  signupZod,
} from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import authorize from "../../middlewares/authorize.js";
import { UserRole } from "@prisma/client";
import { uploadImage } from "../../utils/awss3.js";

const router = Router();

router.get("/:id", authorize(UserRole.ADMIN), authController.getSingle);
router.get("/refresh-token", authController.refreshToken);
router.get("/", authorize(UserRole.ADMIN), authController.getAll);
router.post(
  "/signup",
  uploadImage.single("image"),
  validate(signupZod, { formData: true }),
  authController.signup
);
router.post("/login", validate(loginZodSchema), authController.login);

router.post(
  "/reset-password",
  validate(resetPasswordZod),
  authController.resetPassword
);

router.post(
  "/change-password",
  authorize(UserRole.ADMIN, UserRole.EMPLOYER, UserRole.WORKER),
  validate(changePasswordZod),
  authController.changePassword
);

router.patch(
  "/change-account-status/:userId",
  authorize(UserRole.ADMIN),
  validate(changeAccountStatusZod),
  authController.changeAccountStatus
);

router.post("/logout", authorize(UserRole.ADMIN), authController.logout);

export const authRoutes = router;
