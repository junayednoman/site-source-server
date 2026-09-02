import { Router } from "express";
import { UserRole } from "@prisma/client";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import { chatController } from "./chat.controller.js";
import { sendMessageBodyZod } from "./chat.validation.js";

const router = Router();

router.get(
  "/",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  chatController.getChatList
);

router.get(
  "/:id/messages",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  chatController.getMessages
);

router.post(
  "/:id/messages",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  validate(sendMessageBodyZod),
  chatController.sendMessage
);

router.patch(
  "/:id/read",
  authorize(UserRole.WORKER, UserRole.EMPLOYER),
  chatController.markMessagesAsRead
);

export const chatRoutes = router;
