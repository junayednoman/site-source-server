import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { upload } from "../../utils/awss3.js";
import { employerController } from "./employer.controller.js";
import { updateEmployerProfileZod } from "./employer.validation.js";

const router = Router();

router.get(
  "/profile",
  authorize(UserRole.EMPLOYER),
  employerController.getProfile
);
router.patch(
  "/profile",
  authorize(UserRole.EMPLOYER),
  upload.single("image"),
  validate(updateEmployerProfileZod, { formData: true }),
  employerController.updateProfile
);

export const employerRoutes = router;
