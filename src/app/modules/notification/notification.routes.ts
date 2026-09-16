import { Router } from "express";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { notificationController } from "./notification.controller.js";
import {
  createNotificationZod,
  registerPushTokenZod,
} from "./notification.validation.js";

const router = Router();

router.post(
  "/dummy",
  authorize(),
  validate(createNotificationZod),
  notificationController.create
);

router.get("/", authorize(), notificationController.getAll);

router.post(
  "/push-token",
  authorize(),
  validate(registerPushTokenZod),
  notificationController.registerPushToken
);

router.patch("/read-all", authorize(), notificationController.markAllAsRead);

router.delete("/all", authorize(), notificationController.deleteAll);

router.delete("/:id", authorize(), notificationController.deleteSingle);

export const notificationRoutes = router;
