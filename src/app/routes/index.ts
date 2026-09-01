import { Router } from "express";
import { legalRoutes } from "../modules/legal/legal.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { workerRoutes } from "../modules/worker/worker.routes.js";
import { employerRoutes } from "../modules/employer/employer.routes.js";
import { jobRoutes } from "../modules/job/job.routes.js";
import { otpRoutes } from "../modules/otp/otp.routes.js";
import { supportRoutes } from "../modules/support/support.routes.js";
import { reviewRoutes } from "../modules/review/review.routes.js";
import { bookmarkRoutes } from "../modules/bookmark/bookmark.routes.js";

const router = Router();

const routes = [
  { path: "/legal", route: legalRoutes },
  { path: "/auth", route: authRoutes },
  { path: "/otp", route: otpRoutes },
  { path: "/workers", route: workerRoutes },
  { path: "/employers", route: employerRoutes },
  { path: "/jobs", route: jobRoutes },
  { path: "/support", route: supportRoutes },
  { path: "/reviews", route: reviewRoutes },
  { path: "/bookmarks", route: bookmarkRoutes },
];

routes.forEach(route => {
  router.use(route.path, route.route);
});

export default router;
