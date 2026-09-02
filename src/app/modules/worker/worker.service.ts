import { JobTrade, Prisma, UserRole, UserStatus } from "@prisma/client";
import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import prisma from "../../utils/prisma.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import { TUpdateWorkerProfile } from "./worker.validation.js";

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

const getProfile = async (authId: string) => {
  const profile = await prisma.auth.findUniqueOrThrow({
    where: {
      id: authId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      profile: true,
      workerProfile: true,
    },
  });

  return profile;
};

const getDetails = async (authId: string) => {
  const details = await prisma.auth.findUniqueOrThrow({
    where: {
      id: authId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      profile: true,
      workerProfile: true,
    },
  });

  return details;
};

const getAll = async (
  employerAuthId: string,
  options: TPaginationOptions,
  query: Record<string, unknown>
) => {
  const employerProfile = await prisma.employerProfile.findUnique({
    where: {
      authId: employerAuthId,
    },
    select: {
      address: true,
    },
  });

  const latitude = getNumberQuery(query.latitude) || getNumberQuery(query.lat);
  const longitude =
    getNumberQuery(query.longitude) || getNumberQuery(query.lng);
  const radius = getNumberQuery(query.radius);
  const trades = getTradeQuery(query.trade) || getTradeQuery(query.grade);

  const andConditions: Prisma.AuthWhereInput[] = [
    {
      role: UserRole.WORKER,
      status: UserStatus.ACTIVE,
      workerProfile: {
        isNot: null,
      },
      profile: {
        isNot: null,
      },
    },
  ];

  if (trades?.length) {
    andConditions.push({
      workerProfile: {
        is: {
          trades: {
            hasSome: trades,
          },
        },
      },
    });
  }

  const whereConditions: Prisma.AuthWhereInput = {
    AND: andConditions,
  };

  const workers = await prisma.auth.findMany({
    where: whereConditions,
    select: {
      id: true,
      profile: {
        select: {
          name: true,
          image: true,
        },
      },
      workerProfile: {
        select: {
          address: true,
          experience: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const workerAuthIds = workers.map(worker => worker.id);
  const workerReviews = await prisma.review.groupBy({
    by: ["receiverAuthId"],
    where: {
      receiverAuthId: {
        in: workerAuthIds,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const workerReviewMap = new Map(
    workerReviews.map(review => [
      review.receiverAuthId,
      {
        avgRating: review._avg.rating || 0,
        totalReviews: review._count.rating,
      },
    ])
  );

  const centerCoordinates =
    latitude !== undefined && longitude !== undefined
      ? [longitude, latitude]
      : employerProfile?.address?.coordinates;

  const workersWithDistance = workers
    .map(worker => ({
      ...worker,
      distance: getDistanceInMiles(
        centerCoordinates,
        worker.workerProfile?.address?.coordinates
      ),
    }))
    .filter(worker => {
      if (radius === undefined) return true;
      if (worker.distance === null) return false;

      return worker.distance <= radius;
    });

  const { page, take, skip } = calculatePagination(options);
  const paginatedWorkers = workersWithDistance.slice(skip, skip + take);

  const formattedWorkers = paginatedWorkers.map(worker => {
    const workerReview = workerReviewMap.get(worker.id);

    return {
      id: worker.id,
      image: worker.profile?.image,
      name: worker.profile?.name,
      avgRating: workerReview?.avgRating || 0,
      totalReviews: workerReview?.totalReviews || 0,
      location: worker.workerProfile?.address,
      experience: worker.workerProfile?.experience,
      distance: worker.distance,
    };
  });

  const meta = {
    page,
    limit: take,
    total: workersWithDistance.length,
  };

  return { meta, workers: formattedWorkers };
};

const updateProfile = async (
  authId: string,
  payload: TUpdateWorkerProfile,
  file?: TFile,
  certificateFiles: TFile[] = []
) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  const profileData: Prisma.ProfileUpdateInput = {};
  if (payload.name) {
    profileData.name = payload.name;
  }

  if (file) {
    profileData.image = await uploadToS3(file);
  }

  const workerProfileData: Prisma.WorkerProfileUpdateInput = {};
  if (payload.trades) {
    workerProfileData.trades = payload.trades;
  }
  if (payload.experience !== undefined) {
    workerProfileData.experience = payload.experience;
  }
  if (payload.address) {
    workerProfileData.address = {
      type: payload.address.type || workerProfile.address?.type || "Point",
      coordinates:
        payload.address.coordinates || workerProfile.address?.coordinates || [],
    };
  }

  if (certificateFiles.length) {
    const certificates = [];
    for (const certificateFile of certificateFiles) {
      const certificate = await uploadToS3(certificateFile);
      certificates.push(certificate);
    }

    workerProfileData.certificates = [
      ...workerProfile.certificates,
      ...certificates,
    ];
  }

  const result = await prisma.$transaction(async tn => {
    if (Object.keys(profileData).length) {
      await tn.profile.update({
        where: {
          authId,
        },
        data: profileData,
      });
    }

    if (Object.keys(workerProfileData).length) {
      await tn.workerProfile.update({
        where: {
          authId,
        },
        data: workerProfileData,
      });
    }

    return tn.auth.findUniqueOrThrow({
      where: {
        id: authId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profile: true,
        workerProfile: true,
      },
    });
  });

  if (result && profileData.image && profile.image) {
    await deleteFromS3(profile.image);
  }

  return result;
};

export const workerServices = {
  getAll,
  getProfile,
  getDetails,
  updateProfile,
};
