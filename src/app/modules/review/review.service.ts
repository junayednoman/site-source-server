import { UserRole } from "@prisma/client";
import ApiError from "../../classes/ApiError.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";
import { TCreateReview } from "./review.validation.js";

const create = async (
  giverAuthId: string,
  role: UserRole,
  payload: TCreateReview
) => {
  const job = await prisma.job.findUniqueOrThrow({
    where: {
      id: payload.jobId,
    },
  });

  const existingReview = await prisma.review.findFirst({
    where: {
      jobId: payload.jobId,
      giverAuthId,
    },
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this job!");
  }

  let receiverAuthId = "";

  if (role === UserRole.WORKER) {
    if (job.workerAuthId !== giverAuthId) {
      throw new ApiError(403, "You are not associated with this job!");
    }
    receiverAuthId = job.employerAuthId;
  }

  if (role === UserRole.EMPLOYER) {
    if (job.employerAuthId !== giverAuthId) {
      throw new ApiError(403, "You are not associated with this job!");
    }
    if (!job.workerAuthId) {
      throw new ApiError(400, "No worker is associated with this job!");
    }
    receiverAuthId = job.workerAuthId;
  }

  const result = await prisma.review.create({
    data: {
      jobId: payload.jobId,
      giverAuthId,
      receiverAuthId,
      rating: payload.rating,
      feedback: payload.feedback,
    },
  });

  return result;
};

const getSummary = async (authId: string) => {
  const [ratingSummary, total] = await Promise.all([
    prisma.review.groupBy({
      by: ["rating"],
      where: {
        receiverAuthId: authId,
      },
      _count: {
        rating: true,
      },
      _avg: {
        rating: true,
      },
    }),
    prisma.review.count({
      where: {
        receiverAuthId: authId,
      },
    }),
  ]);

  const ratingGroups = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let ratingTotal = 0;

  ratingSummary.forEach(summary => {
    ratingGroups[summary.rating as keyof typeof ratingGroups] =
      summary._count.rating;
    ratingTotal += summary.rating * summary._count.rating;
  });

  const avgRating = total ? Number((ratingTotal / total).toFixed(1)) : 0;

  return {
    avgRating,
    totalReviews: total,
    ratingGroups,
  };
};

const getAllByUser = async (authId: string, options: TPaginationOptions) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const reviews = await prisma.review.findMany({
    where: {
      receiverAuthId: authId,
    },
    select: {
      id: true,
      rating: true,
      feedback: true,
      givenAt: true,
      job: true,
      giverAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
          workerProfile: true,
          employerProfile: true,
        },
      },
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { givenAt: "desc" },
  });

  const total = await prisma.review.count({
    where: {
      receiverAuthId: authId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, reviews };
};

export const reviewServices = {
  create,
  getSummary,
  getAllByUser,
};
