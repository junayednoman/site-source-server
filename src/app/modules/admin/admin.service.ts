import { Prisma } from "@prisma/client";
import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import prisma from "../../utils/prisma.js";

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

export const adminServices = {
  getProfile,
  updateProfile,
};
