import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { jobController } from "./job.controller.js";
import {
  createTimeSheetZod,
  createJobZod,
  sendJobOfferZod,
  updateApplicationStatusZod,
  updateJobOfferStatusZod,
  updateTimeSheetStatusZod,
} from "./job.validation.js";

const router = Router();

router.get("/", authorize(UserRole.WORKER), jobController.getAllForWorker);

router.get("/my-jobs", authorize(UserRole.EMPLOYER), jobController.getMyJobs);

router.get(
  "/my-job-titles",
  authorize(UserRole.EMPLOYER),
  jobController.getEmployerJobTitles
);

router.get(
  "/applied-jobs",
  authorize(UserRole.WORKER),
  jobController.getMyAppliedJobs
);

router.get(
  "/offers/sent",
  authorize(UserRole.EMPLOYER),
  jobController.getSentOffers
);

router.get(
  "/offers/received",
  authorize(UserRole.WORKER),
  jobController.getReceivedOffers
);

router.post(
  "/offers",
  authorize(UserRole.EMPLOYER),
  validate(sendJobOfferZod),
  jobController.sendOffer
);

router.patch(
  "/offers/:id/status",
  authorize(UserRole.WORKER),
  validate(updateJobOfferStatusZod),
  jobController.changeJobOfferStatus
);

router.patch(
  "/applications/:id/status",
  authorize(UserRole.EMPLOYER),
  validate(updateApplicationStatusZod),
  jobController.changeApplicationStatus
);

router.patch(
  "/timesheets/:id/status",
  authorize(UserRole.EMPLOYER),
  validate(updateTimeSheetStatusZod),
  jobController.changeTimeSheetStatus
);

router.post("/:id/apply", authorize(UserRole.WORKER), jobController.apply);

router.post(
  "/:id/timesheets",
  authorize(UserRole.WORKER),
  validate(createTimeSheetZod),
  jobController.createTimeSheet
);

router.get(
  "/:id/timesheets",
  authorize(UserRole.EMPLOYER, UserRole.WORKER),
  jobController.getTimeSheetByJob
);

router.get(
  "/:id/applications",
  authorize(UserRole.EMPLOYER),
  jobController.getApplicationsByJob
);

router.get("/:id", authorize(UserRole.EMPLOYER), jobController.getSingle);

router.post(
  "/",
  authorize(UserRole.EMPLOYER),
  validate(createJobZod),
  jobController.create
);

export const jobRoutes = router;
