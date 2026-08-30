import { Router } from "express";
import { legalRoutes } from "../modules/legal/legal.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { workerRoutes } from "../modules/worker/worker.routes.js";
import { employerRoutes } from "../modules/employer/employer.routes.js";

const router = Router();

const routes = [
  { path: "/legal", route: legalRoutes },
  { path: "/auth", route: authRoutes },
  { path: "/workers", route: workerRoutes },
  { path: "/employers", route: employerRoutes },
];

routes.forEach(route => {
  router.use(route.path, route.route);
});

export default router;
