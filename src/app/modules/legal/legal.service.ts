import prisma from "../../utils/prisma.js";
import { TUpdateLegal } from "./legal.validation.js";

const legalModel = (prisma as any).legal as {
  findFirst: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
};

const get = async () => {
  const legal = await legalModel.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      privacyPolicy: true,
      termsCondition: true,
      aboutUs: true,
      updatedAt: true,
    },
  });

  return legal;
};

const upsert = async (payload: TUpdateLegal) => {
  const existing = await legalModel.findFirst({
    select: { id: true },
  });

  if (!existing) {
    return legalModel.create({
      data: {
        privacyPolicy: payload.privacyPolicy,
        termsCondition: payload.termsCondition,
        aboutUs: payload.aboutUs,
      },
      select: {
        id: true,
        privacyPolicy: true,
        termsCondition: true,
        aboutUs: true,
        updatedAt: true,
      },
    });
  }

  return legalModel.update({
    where: { id: existing.id },
    data: {
      privacyPolicy: payload.privacyPolicy,
      termsCondition: payload.termsCondition,
      aboutUs: payload.aboutUs,
    },
    select: {
      id: true,
      privacyPolicy: true,
      termsCondition: true,
      aboutUs: true,
      updatedAt: true,
    },
  });
};

export const LegalService = {
  get,
  upsert,
};
