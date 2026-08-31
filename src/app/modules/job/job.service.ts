import { JobStatus, JobTrade, Prisma } from "@prisma/client";
import prisma from "../../utils/prisma.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import { TCreateJob } from "./job.validation.js";

const MILES_PER_KILOMETER = 0.621371;

const getDistanceInMiles = (
  firstCoordinates?: number[],
  secondCoordinates?: number[]
) => {
  if (!firstCoordinates?.length || !secondCoordinates?.length) return null;

  const [firstLongitude, firstLatitude] = firstCoordinates;
  const [secondLongitude, secondLatitude] = secondCoordinates;

  if (
    firstLongitude === undefined ||
    firstLatitude === undefined ||
    secondLongitude === undefined ||
    secondLatitude === undefined
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusInKm = 6371;
  const latitudeDifference = toRadians(secondLatitude - firstLatitude);
  const longitudeDifference = toRadians(secondLongitude - firstLongitude);

  const haversineValue =
    Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const distanceInKm =
    earthRadiusInKm *
    2 *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return Number((distanceInKm * MILES_PER_KILOMETER).toFixed(2));
};

const getStringQuery = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const getNumberQuery = (value: unknown) => {
  const stringValue = getStringQuery(value);
  if (!stringValue) return undefined;

  const numberValue = Number(stringValue);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

const getTradeQuery = (value: unknown) => {
  const stringValue = getStringQuery(value);
  if (!stringValue) return undefined;

  return stringValue
    .split(",")
    .map(trade => trade.trim())
    .filter((trade): trade is JobTrade =>
      Object.values(JobTrade).includes(trade as JobTrade)
    );
};

const create = async (employerAuthId: string, payload: TCreateJob) => {
  const result = await prisma.job.create({
    data: {
      employerAuthId,
      title: payload.title,
      trades: payload.trades,
      hourlyRate: payload.hourlyRate,
      workersNeeded: payload.workersNeeded,
      location: payload.location,
      startDate: payload.startDate,
      endDate: payload.endDate,
      workingHours: payload.workingHours,
      mustHave: payload.mustHave,
      note: payload.note,
    },
  });

  return result;
};

const getMyJobs = async (
  employerAuthId: string,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const andConditions: Prisma.JobWhereInput[] = [
    {
      employerAuthId,
    },
  ];

  if (query.status === "active") {
    andConditions.push({
      status: {
        in: [JobStatus.POSTED, JobStatus.ACTIVE],
      },
    });
  }

  if (query.status === "completed") {
    andConditions.push({
      status: {
        in: [JobStatus.COMPLETED, JobStatus.CANCELLED],
      },
    });
  }

  const whereConditions: Prisma.JobWhereInput = {
    AND: andConditions,
  };

  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const jobs = await prisma.job.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      location: true,
      workersNeeded: true,
      startDate: true,
      endDate: true,
      status: true,
      jobApplications: {
        orderBy: {
          appliedAt: "desc",
        },
        take: 3,
        select: {
          auth: {
            select: {
              profile: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          jobApplications: true,
        },
      },
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.job.count({
    where: whereConditions,
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  const formattedJobs = jobs.map(job => ({
    id: job.id,
    title: job.title,
    location: job.location,
    workersNeeded: job.workersNeeded,
    startDate: job.startDate,
    endDate: job.endDate,
    status: job.status,
    applicants: job.jobApplications.map(application => ({
      name: application.auth.profile?.name,
      image: application.auth.profile?.image,
    })),
    totalApplicants: job._count.jobApplications,
  }));

  return { meta, jobs: formattedJobs };
};

const getAllForWorker = async (
  workerAuthId: string,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: {
      authId: workerAuthId,
    },
    select: {
      trades: true,
      address: true,
    },
  });

  const filter = getStringQuery(query.filter);
  const searchTerm = getStringQuery(query.searchTerm);
  const hourlyRate = getNumberQuery(query.hourlyRate);
  const radius = getNumberQuery(query.radius);
  const trades = getTradeQuery(query.trade);
  const andConditions: Prisma.JobWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          note: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (hourlyRate !== undefined) {
    andConditions.push({
      hourlyRate,
    });
  }

  if (trades?.length) {
    andConditions.push({
      trades: {
        hasSome: trades,
      },
    });
  }

  if (filter === "best-match" || filter === "bestMatch") {
    andConditions.push({
      trades: {
        hasSome: workerProfile.trades,
      },
    });
  }

  if (filter === "closing-soon" || filter === "closingSoon") {
    const today = new Date();
    const closingDate = new Date();
    closingDate.setDate(today.getDate() + 3);

    andConditions.push({
      startDate: {
        gte: today,
        lte: closingDate,
      },
    });
  }

  const whereConditions: Prisma.JobWhereInput = andConditions.length
    ? { AND: andConditions }
    : {};

  const jobs = await prisma.job.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      location: true,
      hourlyRate: true,
      workersNeeded: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      employerAuthId: true,
      employerAuth: {
        select: {
          profile: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
      jobBookmarks: {
        where: {
          authId: workerAuthId,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const employerAuthIds = [...new Set(jobs.map(job => job.employerAuthId))];
  const employerReviews = await prisma.review.groupBy({
    by: ["receiverAuthId"],
    where: {
      receiverAuthId: {
        in: employerAuthIds,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const employerReviewMap = new Map(
    employerReviews.map(review => [
      review.receiverAuthId,
      {
        avgRating: review._avg.rating || 0,
        totalReviews: review._count.rating,
      },
    ])
  );

  const workerCoordinates = workerProfile.address?.coordinates;
  const radiusInMiles =
    filter === "nearby" ? radius || 50 : radius !== undefined ? radius : null;

  const jobsWithDistance = jobs
    .map(job => ({
      ...job,
      distance: getDistanceInMiles(workerCoordinates, job.location.coordinates),
    }))
    .filter(job => {
      if (radiusInMiles === null) return true;
      if (job.distance === null) return false;

      return job.distance <= radiusInMiles;
    });

  const { page, take, skip } = calculatePagination(options);
  const paginatedJobs = jobsWithDistance.slice(skip, skip + take);

  const formattedJobs = paginatedJobs.map(job => {
    const employerReview = employerReviewMap.get(job.employerAuthId);

    return {
      id: job.id,
      employer: {
        name: job.employerAuth.profile?.name,
        image: job.employerAuth.profile?.image,
        avgRating: employerReview?.avgRating || 0,
        totalReviews: employerReview?.totalReviews || 0,
      },
      title: job.title,
      location: job.location,
      distance: job.distance,
      hourlyRate: job.hourlyRate,
      workersNeeded: job.workersNeeded,
      startDate: job.startDate,
      endDate: job.endDate,
      createdAt: job.createdAt,
      hasBookmarked: job.jobBookmarks.length > 0,
    };
  });

  const meta = {
    page,
    limit: take,
    total: jobsWithDistance.length,
  };

  return { meta, jobs: formattedJobs };
};

const getSingle = async (employerAuthId: string, jobId: string) => {
  const job = await prisma.job.findFirstOrThrow({
    where: {
      id: jobId,
      employerAuthId,
    },
    include: {
      employerAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
          employerProfile: true,
        },
      },
      workerAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
          workerProfile: true,
        },
      },
      jobApplications: {
        include: {
          auth: {
            select: {
              id: true,
              email: true,
              role: true,
              profile: true,
              workerProfile: true,
            },
          },
        },
      },
      jobOffer: true,
      timeSheets: true,
      conversations: {
        include: {
          messages: true,
        },
      },
      reviews: true,
      jobBookmarks: true,
    },
  });

  return job;
};

export const jobServices = {
  create,
  getMyJobs,
  getAllForWorker,
  getSingle,
};
