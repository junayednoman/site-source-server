import { Prisma } from "@prisma/client";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";
import {
  TCreateNotification,
  TRegisterPushToken,
} from "./notification.validation.js";

const expo = new Expo();

type TSendPushNotification = {
  authId: string;
  title: string;
  message: string;
  data?: Prisma.InputJsonObject;
  saveToDb?: boolean;
};

const create = async (authId: string, payload: TCreateNotification) => {
  const result = await prisma.notification.create({
    data: {
      authId,
      title: payload.title,
      message: payload.message,
      ...(payload.data ? { data: payload.data as Prisma.InputJsonObject } : {}),
    },
  });

  return result;
};

const registerPushToken = async (
  authId: string,
  payload: TRegisterPushToken
) => {
  const result = await prisma.pushToken.upsert({
    where: {
      authId_installationId: {
        authId,
        installationId: payload.installationId,
      },
    },
    create: {
      authId,
      token: payload.token,
      provider: payload.provider,
      platform: payload.platform,
      installationId: payload.installationId,
      isActive: true,
    },
    update: {
      token: payload.token,
      provider: payload.provider,
      platform: payload.platform,
      isActive: true,
    },
  });

  return result;
};

const sendPushNotification = async ({
  authId,
  title,
  message,
  data = {},
  saveToDb = false,
}: TSendPushNotification) => {
  const dbNotification = saveToDb
    ? await prisma.notification.create({
        data: {
          authId,
          title,
          message,
          data,
        },
      })
    : null;

  const pushTokens = await prisma.pushToken.findMany({
    where: {
      authId,
      provider: "expo",
      isActive: true,
    },
  });

  const invalidTokens = pushTokens
    .filter(item => !Expo.isExpoPushToken(item.token))
    .map(item => item.token);

  const validTokens = pushTokens.filter(item =>
    Expo.isExpoPushToken(item.token)
  );

  const messages: ExpoPushMessage[] = validTokens.map(item => ({
    to: item.token,
    sound: "default",
    title,
    body: message,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);

    tickets.forEach((ticket, index) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        const token = chunk[index]?.to;
        if (typeof token === "string") invalidTokens.push(token);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await prisma.pushToken.updateMany({
      where: {
        token: {
          in: invalidTokens,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  return {
    notification: dbNotification,
    sent: messages.length,
    inactiveTokens: invalidTokens.length,
  };
};

const getAll = async (authId: string, options: TPaginationOptions) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const notifications = await prisma.notification.findMany({
    where: {
      authId,
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { sentAt: "desc" },
  });

  const total = await prisma.notification.count({
    where: {
      authId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, notifications };
};

const markAllAsRead = async (authId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      authId,
      seen: false,
    },
    data: {
      seen: true,
    },
  });

  return result;
};

const deleteSingle = async (authId: string, notificationId: string) => {
  const result = await prisma.notification.delete({
    where: {
      id: notificationId,
      authId,
    },
  });

  return result;
};

const deleteAll = async (authId: string) => {
  const result = await prisma.notification.deleteMany({
    where: {
      authId,
    },
  });

  return result;
};

export const notificationServices = {
  create,
  registerPushToken,
  sendPushNotification,
  getAll,
  markAllAsRead,
  deleteSingle,
  deleteAll,
};
