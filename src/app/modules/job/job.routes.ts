import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { jobController } from "./job.controller.js";
import { createJobZod } from "./job.validation.js";

const router = Router();

router.get("/", authorize(UserRole.WORKER), jobController.getAllForWorker);

router.get("/my-jobs", authorize(UserRole.EMPLOYER), jobController.getMyJobs);

router.get("/:id", authorize(UserRole.EMPLOYER), jobController.getSingle);

router.post(
  "/",
  authorize(UserRole.EMPLOYER),
  validate(createJobZod),
  jobController.create
);

export const jobRoutes = router;
