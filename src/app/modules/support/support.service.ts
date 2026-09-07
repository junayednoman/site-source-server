import { TFile } from "../../interface/file.interface.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";
import { uploadToS3 } from "../../utils/awss3.js";
import { TCreateSupportTicket } from "./support.validation.js";
import { Prisma, UserRole } from "@prisma/client";

const create = async (
  senderAuthId: string,
  payload: TCreateSupportTicket,
  files: TFile[] = []
) => {
  const attachments = [];
  for (const file of files) {
    const attachment = await uploadToS3(file);
    attachments.push(attachment);
  }

  const result = await prisma.supportTicket.create({
    data: {
      senderAuthId,
      subject: payload.subject,
      message: payload.message,
      attachments,
    },
  });

  return result;
};

const getAll = async (
  options: TPaginationOptions,
  authId?: string,
  role?: UserRole
) => {
  const isAdmin = role === UserRole.ADMIN;

  const andConditions: Prisma.SupportTicketWhereInput[] = [];

  if (!isAdmin) {
    andConditions.push({
      senderAuthId: authId,
    });
  }
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const tickets = await prisma.supportTicket.findMany({
    include: {
      senderAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.supportTicket.count();

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, tickets };
};

const getSingle = async (id: string) => {
  const result = await prisma.supportTicket.findUnique({
    where: {
      id,
    },
  });

  return result;
};

export const supportServices = {
  create,
  getAll,
  getSingle,
};
