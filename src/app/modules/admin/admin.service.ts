import { JobStatus, Prisma, UserRole, UserStatus } from "@prisma/client";
import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import prisma from "../../utils/prisma.js";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const getStringQuery = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const getDashboard = async () => {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const nextYearStart = new Date(currentYear + 1, 0, 1);

  const [totalEmployers, totalWorkers, totalJobs, users] = await Promise.all([
    prisma.auth.count({
      where: {
        role: UserRole.EMPLOYER,
      },
    }),
    prisma.auth.count({
      where: {
        role: UserRole.WORKER,
      },
    }),
    prisma.job.count(),
    prisma.auth.findMany({
      where: {
        role: {
          in: [UserRole.EMPLOYER, UserRole.WORKER],
        },
        createdAt: {
          gte: yearStart,
          lt: nextYearStart,
        },
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  const monthlyUserCount = Array(12).fill(0) as number[];
  users.forEach(user => {
    const monthIndex = user.createdAt.getMonth();
    monthlyUserCount[monthIndex] = (monthlyUserCount[monthIndex] || 0) + 1;
  });

  const userGrowth = MONTHS.map((month, index) => ({
    month,
    users: monthlyUserCount[index],
  }));

  return {
    totalEmployers,
    totalWorkers,
    totalJobs,
    userGrowth,
  };
};

const getProfile = async (authId: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  return profile;
};

const updateProfile = async (
  authId: string,
  payload: Prisma.ProfileUpdateInput,
  file?: TFile
) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  if (file) {
    payload.image = await uploadToS3(file);
  }

  const result = await prisma.profile.update({
    where: {
      authId,
    },
    data: payload,
  });

  if (result && payload.image && profile.image) {
    await deleteFromS3(profile.image);
  }

  return result;
};

const getAllUsers = async (
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const { page, take, skip } = calculatePagination(options);
  const searchTerm = getStringQuery(query.searchTerm);
  const role = getStringQuery(query.role);

  const andConditions: Prisma.AuthWhereInput[] = [
    {
      role: {
        in: [UserRole.EMPLOYER, UserRole.WORKER],
      },
    },
  ];

  if (role === UserRole.EMPLOYER || role === UserRole.WORKER) {
    andConditions.push({
      role,
    });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          profile: {
            is: {
              name: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  const whereConditions: Prisma.AuthWhereInput = {
    AND: andConditions,
  };

  const users = await prisma.auth.findMany({
    where: whereConditions,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });

  const userAuthIds = users.map(user => user.id);
  const userReviews = await prisma.review.groupBy({
    by: ["receiverAuthId"],
    where: {
      receiverAuthId: {
        in: userAuthIds,
      },
    },
    _avg: {
      rating: true,
    },
  });

  const userReviewMap = new Map(
    userReviews.map(review => [
      review.receiverAuthId,
      review._avg.rating ? Number(review._avg.rating.toFixed(1)) : 0,
    ])
  );

  const total = await prisma.auth.count({
    where: whereConditions,
  });

  const formattedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.profile?.name,
    image: user.profile?.image,
    avgRating: userReviewMap.get(user.id) || 0,
    status: user.status,
    role: user.role,
    joiningDate: user.createdAt,
  }));

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, users: formattedUsers };
};

const changeUserStatus = async (authId: string, status: UserStatus) => {
  const user = await prisma.auth.findFirstOrThrow({
    where: {
      id: authId,
      role: {
        in: [UserRole.EMPLOYER, UserRole.WORKER],
      },
    },
  });

  const result = await prisma.auth.update({
    where: {
      id: user.id,
    },
    data: {
      status,
    },
  });

  return result;
};

const getAllJobs = async (
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const { page, take, skip } = calculatePagination(options);
  const searchTerm = getStringQuery(query.searchTerm);
  const status = getStringQuery(query.status);
  const andConditions: Prisma.JobWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      title: {
        contains: searchTerm,
        mode: "insensitive",
      },
    });
  }

  if (status && Object.values(JobStatus).includes(status as JobStatus)) {
    andConditions.push({
      status: status as JobStatus,
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
      hourlyRate: true,
      status: true,
      location: true,
      createdAt: true,
      employerAuth: {
        select: {
          email: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const total = await prisma.job.count({
    where: whereConditions,
  });

  const formattedJobs = jobs.map(job => ({
    id: job.id,
    title: job.title,
    hourlyRate: job.hourlyRate,
    employer: {
      name: job.employerAuth.profile?.name,
      email: job.employerAuth.email,
      image: job.employerAuth.profile?.image,
    },
    status: job.status,
    location: job.location,
    postedAt: job.createdAt,
  }));

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, jobs: formattedJobs };
};

const deleteJob = async (jobId: string) => {
  await prisma.job.findUniqueOrThrow({
    where: {
      id: jobId,
    },
  });

  const result = await prisma.$transaction(async tn => {
    const timeSheets = await tn.timeSheet.findMany({
      where: {
        jobId,
      },
      select: {
        id: true,
      },
    });
    const timeSheetIds = timeSheets.map(timeSheet => timeSheet.id);

    await tn.timeSheetDayEntry.deleteMany({
      where: {
        timeSheetId: {
          in: timeSheetIds,
        },
      },
    });

    await tn.timeSheet.deleteMany({
      where: {
        jobId,
      },
    });

    const conversations = await tn.conversation.findMany({
      where: {
        jobId,
      },
      select: {
        id: true,
      },
    });
    const conversationIds = conversations.map(conversation => conversation.id);

    await tn.message.deleteMany({
      where: {
        conversationId: {
          in: conversationIds,
        },
      },
    });

    await tn.conversation.deleteMany({
      where: {
        jobId,
      },
    });

    await tn.jobApplication.deleteMany({
      where: {
        jobId,
      },
    });

    await tn.jobOffer.deleteMany({
      where: {
        jobId,
      },
    });

    await tn.review.deleteMany({
      where: {
        jobId,
      },
    });

    await tn.jobBookmark.deleteMany({
      where: {
        jobId,
      },
    });

    return tn.job.delete({
      where: {
        id: jobId,
      },
    });
  });

  return result;
};

const getAllSupports = async (options: TPaginationOptions) => {
  const { page, take, skip } = calculatePagination(options);

  const supports = await prisma.supportTicket.findMany({
    include: {
      senderAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: true,
          workerProfile: true,
          employerProfile: true,
        },
      },
    },
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });

  const total = await prisma.supportTicket.count();
  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, supports };
};

const getAllReviews = async (options: TPaginationOptions) => {
  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);

  const reviews = await prisma.review.findMany({
    include: {
      job: true,
      giverAuth: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      receiverAuth: {
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { givenAt: "desc" },
  });

  const total = await prisma.review.count();
  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, reviews };
};

const deleteReview = async (reviewId: string) => {
  const result = await prisma.review.delete({
    where: {
      id: reviewId,
    },
  });

  return result;
};

export const adminServices = {
  getDashboard,
  getProfile,
  updateProfile,
  getAllUsers,
  changeUserStatus,
  getAllJobs,
  deleteJob,
  getAllSupports,
  getAllReviews,
  deleteReview,
};
