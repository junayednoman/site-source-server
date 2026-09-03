import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";
import { TCreateNotification } from "./notification.validation.js";

const create = async (authId: string, payload: TCreateNotification) => {
  const result = await prisma.notification.create({
    data: {
      authId,
      title: payload.title,
      message: payload.message,
    },
  });

  return result;
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
  getAll,
  markAllAsRead,
  deleteSingle,
  deleteAll,
};
