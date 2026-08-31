import { Prisma } from "@prisma/client";
import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import prisma from "../../utils/prisma.js";
import { TUpdateWorkerProfile } from "./worker.validation.js";

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
  getProfile,
  updateProfile,
};
