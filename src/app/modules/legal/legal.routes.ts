import { Router } from "express";

import authorize from "../../middlewares/authorize.js";
import { LegalController } from "./legal.controller.js";
import { updateLegalSchema } from "./legal.validation.js";
import validate from "../../middlewares/validate.js";
import { UserRole } from "@prisma/client";

const router = Router();

router.get("/", LegalController.get);
router.patch(
  "/",
  authorize(UserRole.ADMIN),
  validate(updateLegalSchema),
  LegalController.update
);

export const legalRoutes = router;
