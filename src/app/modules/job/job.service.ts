import {
  ApplicationStatus,
  JobStatus,
  JobOfferStatus,
  Prisma,
  TimeSheetStatus,
  UserRole,
} from "@prisma/client";
import ApiError from "../../classes/ApiError.js";
import prisma from "../../utils/prisma.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import {
  TCreateJob,
  TCreateTimeSheet,
  TSendJobOffer,
} from "./job.validation.js";
import {
  EMPTY_OBJECT_ID,
  getDateQuery,
  getDistanceInMiles,
  getNumberQuery,
  getStringQuery,
  getTimeSheetWeeks,
  getTradeQuery,
} from "./job.utils.js";

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
      hourlyRate: true,
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
  workerAuthId: string | undefined,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const filter = getStringQuery(query.filter);
  const searchTerm = getStringQuery(query.searchTerm);
  const hourlyRate = getNumberQuery(query.hourlyRate);
  const latitude = getNumberQuery(query.latitude) || getNumberQuery(query.lat);
  const longitude =
    getNumberQuery(query.longitude) ||
    getNumberQuery(query.long) ||
    getNumberQuery(query.lng);
  const radius = getNumberQuery(query.radius);
  const trades = getTradeQuery(query.trade);
  const andConditions: Prisma.JobWhereInput[] = [];

  andConditions.push({
    status: JobStatus.POSTED,
    startDate: {
      gte: new Date(),
    },
  });

  if (workerAuthId) {
    andConditions.push({
      jobApplications: {
        none: {
          authId: workerAuthId,
        },
      },
    });
  }

  if (workerAuthId && (filter === "best-match" || filter === "bestMatch")) {
    const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
      where: {
        authId: workerAuthId,
      },
      select: {
        trades: true,
      },
    });

    andConditions.push({
      trades: {
        hasSome: workerProfile.trades,
      },
    });
  }

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
          authId: workerAuthId || EMPTY_OBJECT_ID,
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

  const userCoordinates =
    latitude !== undefined && longitude !== undefined
      ? [longitude, latitude]
      : undefined;
  const radiusInMiles =
    userCoordinates && (filter === "nearby" || radius !== undefined)
      ? filter === "nearby"
        ? radius || 50
        : radius || null
      : null;

  const jobsWithDistance = jobs
    .map(job => ({
      ...job,
      distance: getDistanceInMiles(userCoordinates, job.location.coordinates),
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
      hasBookmarked: workerAuthId ? job.jobBookmarks.length > 0 : false,
    };
  });

  const meta = {
    page,
    limit: take,
    total: jobsWithDistance.length,
  };

  return { meta, jobs: formattedJobs };
};

const getAvailableMapJobsForWorker = async (
  workerAuthId: string | undefined,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const latitude = getNumberQuery(query.latitude) || getNumberQuery(query.lat);
  const longitude =
    getNumberQuery(query.longitude) ||
    getNumberQuery(query.long) ||
    getNumberQuery(query.lng);
  const radius = getNumberQuery(query.radius);
  const trades = getTradeQuery(query.trade);
  const startDateFrom = getDateQuery(query.startDateFrom);
  const startDateTo = getDateQuery(query.startDateTo);

  const andConditions: Prisma.JobWhereInput[] = [
    {
      status: JobStatus.POSTED,
      startDate: {
        gte: new Date(),
      },
    },
  ];

  if (workerAuthId) {
    andConditions.push({
      jobApplications: {
        none: {
          authId: workerAuthId,
        },
      },
    });
  }

  if (trades?.length) {
    andConditions.push({
      trades: {
        hasSome: trades,
      },
    });
  }

  if (startDateFrom || startDateTo) {
    andConditions.push({
      startDate: {
        ...(startDateFrom && startDateFrom > new Date()
          ? { gte: startDateFrom }
          : { gte: new Date() }),
        ...(startDateTo ? { lte: startDateTo } : {}),
      },
    });
  }

  const whereConditions: Prisma.JobWhereInput = {
    AND: andConditions,
  };

  const jobs = await prisma.job.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      location: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const userCoordinates =
    latitude !== undefined && longitude !== undefined
      ? [longitude, latitude]
      : undefined;

  const filteredJobs = jobs.filter(job => {
    if (!userCoordinates) return true;

    const distance = getDistanceInMiles(
      userCoordinates,
      job.location.coordinates
    );
    if (distance === null) return false;

    return distance <= (radius || 10);
  });

  const { page, take, skip } = calculatePagination(options);
  const paginatedJobs = filteredJobs.slice(skip, skip + take);

  const meta = {
    page,
    limit: take,
    total: filteredJobs.length,
  };

  return { meta, jobs: paginatedJobs };
};

const getActiveJobsForWorker = async (
  workerAuthId: string,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: {
      authId: workerAuthId,
    },
    select: {
      address: true,
    },
  });

  const andConditions: Prisma.JobWhereInput[] = [
    {
      workerAuthId,
      status: {
        not: JobStatus.POSTED,
      },
    },
  ];

  if (query.status === "active") {
    andConditions.push({
      status: JobStatus.ACTIVE,
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
      employerAuthId: true,
      title: true,
      location: true,
      workersNeeded: true,
      status: true,
      startDate: true,
      endDate: true,
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
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.job.count({
    where: whereConditions,
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
  const formattedJobs = jobs.map(job => {
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
      distance: getDistanceInMiles(workerCoordinates, job.location.coordinates),
      workersNeeded: job.workersNeeded,
      status: job.status,
      startDate: job.startDate,
      endDate: job.endDate,
    };
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, jobs: formattedJobs };
};

const getSingle = async (
  jobId: string,
  authId: string | undefined,
  role: UserRole | undefined
) => {
  const job = await prisma.job.findFirstOrThrow({
    where: {
      id: jobId,
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
      jobOffers: true,
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

  const isApplied =
    role === UserRole.WORKER && authId
      ? Boolean(
          await prisma.jobApplication.count({
            where: {
              jobId,
              authId,
            },
          })
        )
      : false;

  return {
    ...job,
    isApplied,
    timeSheetWeeks: getTimeSheetWeeks(job.startDate, job.endDate),
  };
};

const apply = async (workerAuthId: string, jobId: string) => {
  const job = await prisma.job.findUniqueOrThrow({
    where: {
      id: jobId,
    },
  });

  if (job.startDate < new Date()) {
    throw new ApiError(
      400,
      "Cannot apply to a job whose start date has passed!"
    );
  }

  const existingApplication = await prisma.jobApplication.findUnique({
    where: {
      jobId_authId: {
        jobId,
        authId: workerAuthId,
      },
    },
  });

  if (existingApplication) {
    throw new ApiError(400, "You have already applied to this job!");
  }

  const result = await prisma.jobApplication.create({
    data: {
      jobId,
      authId: workerAuthId,
    },
  });

  return result;
};

const getMyAppliedJobs = async (
  workerAuthId: string,
  options: TPaginationOptions
) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const applications = await prisma.jobApplication.findMany({
    where: {
      authId: workerAuthId,
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { appliedAt: "desc" },
  });

  const total = await prisma.jobApplication.count({
    where: {
      authId: workerAuthId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, applications };
};

const getApplicationsByJob = async (
  employerAuthId: string,
  jobId: string,
  options: TPaginationOptions
) => {
  await prisma.job.findFirstOrThrow({
    where: {
      id: jobId,
      employerAuthId,
    },
  });

  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const applications = await prisma.jobApplication.findMany({
    where: {
      jobId,
    },
    include: {
      auth: {
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { appliedAt: "desc" },
  });

  const total = await prisma.jobApplication.count({
    where: {
      jobId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, applications };
};

const changeApplicationStatus = async (
  employerAuthId: string,
  applicationId: string,
  status: ApplicationStatus
) => {
  const application = await prisma.jobApplication.findFirstOrThrow({
    where: {
      id: applicationId,
      job: {
        employerAuthId,
      },
    },
    include: {
      job: true,
    },
  });

  if (application.status !== ApplicationStatus.PENDING) {
    throw new ApiError(400, "Application status has already been changed!");
  }

  if (status === ApplicationStatus.REJECTED) {
    const result = await prisma.jobApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status,
      },
    });

    return result;
  }

  const result = await prisma.$transaction(async tn => {
    const acceptedApplication = await tn.jobApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.ACCEPTED,
      },
    });

    await tn.jobApplication.updateMany({
      where: {
        jobId: application.jobId,
        id: {
          not: applicationId,
        },
      },
      data: {
        status: ApplicationStatus.REJECTED,
      },
    });

    await tn.job.update({
      where: {
        id: application.jobId,
      },
      data: {
        status: JobStatus.ACTIVE,
        workerAuthId: application.authId,
      },
    });

    await tn.conversation.upsert({
      where: {
        jobId_employerAuthId_workerAuthId: {
          jobId: application.jobId,
          employerAuthId,
          workerAuthId: application.authId,
        },
      },
      update: {},
      create: {
        jobId: application.jobId,
        employerAuthId,
        workerAuthId: application.authId,
      },
    });

    return acceptedApplication;
  });

  return result;
};

const sendOffer = async (employerAuthId: string, payload: TSendJobOffer) => {
  await prisma.job.findFirstOrThrow({
    where: {
      id: payload.jobId,
      employerAuthId,
    },
  });

  await prisma.auth.findFirstOrThrow({
    where: {
      id: payload.workerAuthId,
      role: UserRole.WORKER,
    },
  });

  const existingOffer = await prisma.jobOffer.findFirst({
    where: {
      jobId: payload.jobId,
      workerAuthId: payload.workerAuthId,
    },
  });

  if (existingOffer) {
    throw new ApiError(400, "Job offer already sent to this worker!");
  }

  const result = await prisma.jobOffer.create({
    data: {
      jobId: payload.jobId,
      workerAuthId: payload.workerAuthId,
    },
  });

  return result;
};

const getSentOffers = async (
  employerAuthId: string,
  options: TPaginationOptions
) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const offers = await prisma.jobOffer.findMany({
    where: {
      job: {
        employerAuthId,
      },
    },
    include: {
      job: true,
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { offeredAt: "desc" },
  });

  const total = await prisma.jobOffer.count({
    where: {
      job: {
        employerAuthId,
      },
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, offers };
};

const getReceivedOffers = async (
  workerAuthId: string,
  options: TPaginationOptions
) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const offers = await prisma.jobOffer.findMany({
    where: {
      workerAuthId,
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { offeredAt: "desc" },
  });

  const total = await prisma.jobOffer.count({
    where: {
      workerAuthId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, offers };
};

const getEmployerJobTitles = async (employerAuthId: string) => {
  const jobs = await prisma.job.findMany({
    where: {
      employerAuthId,
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return jobs;
};

const changeJobOfferStatus = async (
  workerAuthId: string,
  offerId: string,
  status: JobOfferStatus
) => {
  const offer = await prisma.jobOffer.findFirstOrThrow({
    where: {
      id: offerId,
      workerAuthId,
    },
    include: {
      job: true,
    },
  });

  if (offer.status !== JobOfferStatus.PENDING) {
    throw new ApiError(400, "Job offer status has already been changed!");
  }

  if (status === JobOfferStatus.REJECTED) {
    const result = await prisma.jobOffer.update({
      where: {
        id: offerId,
      },
      data: {
        status,
      },
    });

    return result;
  }

  const result = await prisma.$transaction(async tn => {
    const acceptedOffer = await tn.jobOffer.update({
      where: {
        id: offerId,
      },
      data: {
        status: JobOfferStatus.ACCEPTED,
      },
    });

    await tn.jobApplication.updateMany({
      where: {
        jobId: offer.jobId,
      },
      data: {
        status: ApplicationStatus.REJECTED,
      },
    });

    await tn.job.update({
      where: {
        id: offer.jobId,
      },
      data: {
        status: JobStatus.ACTIVE,
        workerAuthId,
      },
    });

    await tn.conversation.upsert({
      where: {
        jobId_employerAuthId_workerAuthId: {
          jobId: offer.jobId,
          employerAuthId: offer.job.employerAuthId,
          workerAuthId,
        },
      },
      update: {},
      create: {
        jobId: offer.jobId,
        employerAuthId: offer.job.employerAuthId,
        workerAuthId,
      },
    });

    return acceptedOffer;
  });

  return result;
};

const createTimeSheet = async (
  workerAuthId: string,
  jobId: string,
  payload: TCreateTimeSheet
) => {
  await prisma.job.findFirstOrThrow({
    where: {
      id: jobId,
      workerAuthId,
    },
  });

  const existingTimeSheet = await prisma.timeSheet.findUnique({
    where: {
      jobId_workerAuthId: {
        jobId,
        workerAuthId,
      },
    },
  });

  if (existingTimeSheet) {
    throw new ApiError(400, "TimeSheet already exists for this job!");
  }

  const result = await prisma.timeSheet.create({
    data: {
      jobId,
      workerAuthId,
      week: payload.week,
      timeSheetDays: {
        create: payload.timeSheetDays.map(timeSheetDay => ({
          day: timeSheetDay.day,
          hours: timeSheetDay.hours,
        })),
      },
    },
    include: {
      timeSheetDays: true,
    },
  });

  return result;
};

const getTimeSheetByJob = async (
  authId: string,
  role: UserRole,
  jobId: string
) => {
  const whereConditions: Prisma.TimeSheetWhereInput = {
    jobId,
  };

  if (role === UserRole.WORKER) {
    whereConditions.workerAuthId = authId;
  }

  if (role === UserRole.EMPLOYER) {
    whereConditions.job = {
      employerAuthId: authId,
    };
  }

  const timeSheet = await prisma.timeSheet.findFirstOrThrow({
    where: whereConditions,
    include: {
      workerAuth: {
        select: {
          id: true,
          email: true,
          profile: true,
          workerProfile: true,
        },
      },
      job: true,
      timeSheetDays: true,
    },
  });

  return timeSheet;
};

const getPendingTimeSheetsForEmployer = async (
  employerAuthId: string,
  options: TPaginationOptions
) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const whereConditions: Prisma.TimeSheetWhereInput = {
    job: {
      employerAuthId,
    },
    timeSheetDays: {
      some: {
        status: TimeSheetStatus.PENDING,
      },
    },
  };

  const timeSheets = await prisma.timeSheet.findMany({
    where: whereConditions,
    include: {
      workerAuth: {
        select: {
          id: true,
          email: true,
          profile: true,
          workerProfile: true,
        },
      },
      job: true,
      timeSheetDays: true,
    },
    skip,
    take,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.timeSheet.count({
    where: whereConditions,
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, timeSheets };
};

const changeTimeSheetStatus = async (
  employerAuthId: string,
  timeSheetDayId: string,
  status: TimeSheetStatus
) => {
  const timeSheetDay = await prisma.timeSheetDayEntry.findFirstOrThrow({
    where: {
      id: timeSheetDayId,
      timeSheet: {
        job: {
          employerAuthId,
        },
      },
    },
  });

  const result = await prisma.timeSheetDayEntry.update({
    where: {
      id: timeSheetDay.id,
    },
    data: {
      status,
    },
  });

  return result;
};

const approveAllTimeSheetDays = async (
  employerAuthId: string,
  timeSheetId: string
) => {
  await prisma.timeSheet.findFirstOrThrow({
    where: {
      id: timeSheetId,
      job: {
        employerAuthId,
      },
    },
  });

  await prisma.timeSheetDayEntry.updateMany({
    where: {
      timeSheetId,
    },
    data: {
      status: TimeSheetStatus.APPROVED,
    },
  });

  const result = await prisma.timeSheet.findUniqueOrThrow({
    where: {
      id: timeSheetId,
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
      job: true,
      timeSheetDays: true,
    },
  });

  return result;
};

export const jobServices = {
  create,
  getMyJobs,
  getAllForWorker,
  getAvailableMapJobsForWorker,
  getActiveJobsForWorker,
  getSingle,
  apply,
  getMyAppliedJobs,
  getApplicationsByJob,
  changeApplicationStatus,
  sendOffer,
  getSentOffers,
  getReceivedOffers,
  getEmployerJobTitles,
  changeJobOfferStatus,
  createTimeSheet,
  getTimeSheetByJob,
  getPendingTimeSheetsForEmployer,
  changeTimeSheetStatus,
  approveAllTimeSheetDays,
};
