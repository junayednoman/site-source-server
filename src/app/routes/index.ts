import { Router } from "express";
import { legalRoutes } from "../modules/legal/legal.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";

const router = Router();

const routes = [
  { path: "/legal", route: legalRoutes },
  { path: "/auth", route: authRoutes },
];

routes.forEach(route => {
  router.use(route.path, route.route);
});

export default router;
