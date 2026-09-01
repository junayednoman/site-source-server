import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { upload } from "../../utils/awss3.js";
import { supportController } from "./support.controller.js";
import { createSupportTicketZod } from "./support.validation.js";

const router = Router();

router.post(
  "/",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  upload.array("attachments"),
  validate(createSupportTicketZod, { formData: true }),
  supportController.create
);

router.get("/", authorize(UserRole.ADMIN), supportController.getAll);

export const supportRoutes = router;
