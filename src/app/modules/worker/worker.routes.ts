import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { upload } from "../../utils/awss3.js";
import { workerController } from "./worker.controller.js";
import { updateWorkerProfileZod } from "./worker.validation.js";

const router = Router();

router.get("/", authorize(UserRole.EMPLOYER), workerController.getAll);
router.get("/profile", authorize(), workerController.getProfile);
router.get("/details", authorize(UserRole.WORKER), workerController.getDetails);
router.patch(
  "/profile",
  authorize(UserRole.WORKER),
  upload.fields([{ name: "image", maxCount: 1 }, { name: "certificates" }]),
  validate(updateWorkerProfileZod, { formData: true }),
  workerController.updateProfile
);

export const workerRoutes = router;
