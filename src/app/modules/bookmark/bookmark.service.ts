import { UserRole } from "@prisma/client";
import ApiError from "../../classes/ApiError.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";
import {
  TCreateJobBookmark,
  TCreateWorkerBookmark,
} from "./bookmark.validation.js";

const createJobBookmark = async (
  authId: string,
  payload: TCreateJobBookmark
) => {
  await prisma.job.findUniqueOrThrow({
    where: {
      id: payload.jobId,
    },
  });

  const existingBookmark = await prisma.jobBookmark.findFirst({
    where: {
      authId,
      jobId: payload.jobId,
    },
  });

  if (existingBookmark) {
    throw new ApiError(400, "Job already bookmarked!");
  }

  const result = await prisma.jobBookmark.create({
    data: {
      authId,
      jobId: payload.jobId,
    },
  });

  return result;
};

const getJobBookmarks = async (authId: string, options: TPaginationOptions) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const bookmarks = await prisma.jobBookmark.findMany({
    where: {
      authId,
    },
    include: {
      job: {
        include: {
          employerAuth: {
            select: {
              id: true,
              email: true,
              profile: true,
              employerProfile: true,
            },
          },
        },
      },
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.jobBookmark.count({
    where: {
      authId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, bookmarks };
};

const createWorkerBookmark = async (
  authId: string,
  payload: TCreateWorkerBookmark
) => {
  await prisma.auth.findFirstOrThrow({
    where: {
      id: payload.workerAuthId,
      role: UserRole.WORKER,
    },
  });

  const existingBookmark = await prisma.workerBookmark.findFirst({
    where: {
      authId,
      workerAuthId: payload.workerAuthId,
    },
  });

  if (existingBookmark) {
    throw new ApiError(400, "Worker already bookmarked!");
  }

  const result = await prisma.workerBookmark.create({
    data: {
      authId,
      workerAuthId: payload.workerAuthId,
    },
  });

  return result;
};

const getWorkerBookmarks = async (
  authId: string,
  options: TPaginationOptions
) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const bookmarks = await prisma.workerBookmark.findMany({
    where: {
      authId,
    },
    include: {
      workerAuth: {
        select: {
          id: true,
          email: true,
          profile: true,
          workerProfile: true,
        },
      },
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.workerBookmark.count({
    where: {
      authId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, bookmarks };
};

export const bookmarkServices = {
  createJobBookmark,
  getJobBookmarks,
  createWorkerBookmark,
  getWorkerBookmarks,
};
