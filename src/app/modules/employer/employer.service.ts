import { Prisma } from "@prisma/client";
import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import prisma from "../../utils/prisma.js";
import { TUpdateEmployerProfile } from "./employer.validation.js";

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
      employerProfile: true,
    },
  });

  return profile;
};

const updateProfile = async (
  authId: string,
  payload: TUpdateEmployerProfile,
  file?: TFile
) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  const employerProfile = await prisma.employerProfile.findUniqueOrThrow({
    where: {
      authId,
    },
  });

  const profileData: Prisma.ProfileUpdateInput = {};
  if (payload.name) {
    profileData.name = payload.name;
  }

  const employerProfileData: Prisma.EmployerProfileUpdateInput = {};
  if (payload.address) {
    employerProfileData.address = payload.address;
  }

  if (file) {
    const image = await uploadToS3(file);
    profileData.image = image;
    employerProfileData.logo = image;
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

    if (Object.keys(employerProfileData).length) {
      await tn.employerProfile.update({
        where: {
          authId,
        },
        data: employerProfileData,
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
        employerProfile: true,
      },
    });
  });

  if (result && profileData.image && profile.image) {
    await deleteFromS3(profile.image);
  }

  if (result && employerProfileData.logo && employerProfile.logo) {
    await deleteFromS3(employerProfile.logo);
  }

  return result;
};

export const employerServices = {
  getProfile,
  updateProfile,
};
