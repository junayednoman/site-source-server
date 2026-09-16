import { Prisma } from "@prisma/client";
import { isUserOnline } from "../../socket/socket.js";
import { notificationServices } from "./notification.service.js";

type TSendNotification = {
  authId: string;
  title: string;
  message: string;
  data?: Prisma.InputJsonObject;
};

export const sendNotification = async ({
  authId,
  title,
  message,
  data,
}: TSendNotification) => {
  if (isUserOnline(authId)) return;

  try {
    await notificationServices.sendPushNotification({
      authId,
      title,
      message,
      data,
      saveToDb: true,
    });
  } catch (error) {
    console.error("Failed to send notification", error);
  }
};
