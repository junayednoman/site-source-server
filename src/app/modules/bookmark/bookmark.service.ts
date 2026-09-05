import { UserRole } from "@prisma/client";
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
    await prisma.jobBookmark.delete({
      where: {
        id: existingBookmark.id,
      },
    });

    return {
      isBookmarked: false,
      bookmark: null,
    };
  }

  const bookmark = await prisma.jobBookmark.create({
    data: {
      authId,
      jobId: payload.jobId,
    },
  });

  return {
    isBookmarked: true,
    bookmark,
  };
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
    await prisma.workerBookmark.delete({
      where: {
        id: existingBookmark.id,
      },
    });

    return {
      isBookmarked: false,
      bookmark: null,
    };
  }

  const bookmark = await prisma.workerBookmark.create({
    data: {
      authId,
      workerAuthId: payload.workerAuthId,
    },
  });

  return {
    isBookmarked: true,
    bookmark,
  };
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
