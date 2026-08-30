import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { upload } from "../../utils/awss3.js";
import { workerController } from "./worker.controller.js";
import { updateWorkerProfileZod } from "./worker.validation.js";

const router = Router();

router.get("/profile", authorize(UserRole.WORKER), workerController.getProfile);
router.patch(
  "/profile",
  authorize(UserRole.WORKER),
  upload.single("image"),
  validate(updateWorkerProfileZod, { formData: true }),
  workerController.updateProfile
);

export const workerRoutes = router;
