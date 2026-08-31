import {
  LoginProvider,
  OTPPurpose,
  Prisma,
  UserRole,
  UserStatus,
} from "@prisma/client";
import crypto from "crypto";
import ApiError from "../../classes/ApiError.js";
import prisma from "../../utils/prisma.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import {
  TChangePasswordInput,
  TLoginInput,
  TResetPasswordInput,
  TSignup,
} from "./auth.validation.js";
import bcrypt from "bcrypt";
import jsonwebtoken, { Secret } from "jsonwebtoken";
import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import { TAuthUser } from "../../interface/global.interface.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import generateOTP from "../../utils/generateOTP.js";
import { TFile } from "../../interface/file.interface.js";

const signUp = async (payload: TSignup, file?: TFile) => {
  const existingUser = await prisma.auth.findUnique({
    where: {
      email: payload.email,
      status: { not: UserStatus.PENDING },
    },
  });

  if (existingUser) throw new ApiError(400, "User already exists!");

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const authData = {
    email: payload.email,
    password: hashedPassword,
    role: payload.role,
    loginProvider: LoginProvider.EMAIL,
  };

  const otp = generateOTP();

  const imageUrl = file ? await uploadToS3(file) : undefined;

  try {
    const result = await prisma.$transaction(async tn => {
      const result = await tn.auth.upsert({
        where: {
          email: payload.email,
        },
        create: authData,
        update: authData,
      });

      await tn.profile.upsert({
        where: {
          authId: result.id,
        },
        create: {
          authId: result.id,
          name: payload.name,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        update: {
          name: payload.name,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      });

      if (payload.role === UserRole.WORKER) {
        const workerProfileUpdateData = {
          ...(payload.trades ? { trades: payload.trades } : {}),
          ...(payload.experience !== undefined
            ? { experience: payload.experience }
            : {}),
          ...(payload.address ? { address: payload.address } : {}),
          ...(payload.certificates
            ? { certificates: payload.certificates }
            : {}),
        };

        await tn.workerProfile.upsert({
          where: {
            authId: result.id,
          },
          create: {
            authId: result.id,
            trades: payload.trades || [],
            ...(payload.experience !== undefined
              ? { experience: payload.experience }
              : {}),
            ...(payload.address ? { address: payload.address } : {}),
            certificates: payload.certificates || [],
          },
          update: workerProfileUpdateData,
        });
      }

      if (payload.role === UserRole.EMPLOYER) {
        const employerProfileData = {
          ...(payload.address ? { address: payload.address } : {}),
        };

        await tn.employerProfile.upsert({
          where: {
            authId: result.id,
          },
          create: {
            authId: result.id,
            ...employerProfileData,
          },
          update: employerProfileData,
        });
      }

      const hashedOtp = await bcrypt.hash(otp.toString(), 10);
      const otpExpires = new Date(Date.now() + 2 * 60 * 1000);

      const otpData = {
        authId: result.id,
        otp: hashedOtp,
        expires: otpExpires,
        attempts: 0,
        purpose: OTPPurpose.VERIFY_ACCOUNT,
      };

      await tn.oTP.upsert({
        where: {
          authId: result.id,
        },
        update: otpData,
        create: otpData,
      });
      return result;
    });

    // sendEmail
    if (result) {
      const subject = "Complete your signup – verify your email";
      const replacements = {
        otp,
        name: payload.name,
      };
      const path = "./src/app/emailTemplates/welcome.html";
      sendEmail(payload.email, subject, path, replacements);
    }

    return {
      id: result.id,
      email: result.email,
      role: result.role,
      status: result.status,
      createdAt: result.createdAt,
    };
  } catch (error) {
    if (imageUrl) await deleteFromS3(imageUrl);
    throw error;
  }
};

const login = async (payload: TLoginInput) => {
  const auth = await prisma.auth.findUnique({
    where: {
      email: payload.email,
      NOT: [
        {
          status: UserStatus.DELETED,
        },
      ],
    },
  });

  if (!auth) {
    throw new ApiError(400, "Invalid email or password!");
  }

  if (auth.status === UserStatus.PENDING)
    throw new ApiError(400, "Please verify your account!");

  if (auth.status === UserStatus.BLOCKED)
    throw new ApiError(400, "Your account is blocked!");

  if (auth.loginProvider === LoginProvider.GOOGLE)
    throw new ApiError(400, "Your account was created using Google!");

  const hasMatched = await bcrypt.compare(payload.password, auth.password);
  if (!hasMatched) throw new ApiError(400, "Invalid email or password!");

  // prepare tokens
  const jwtPayload = {
    email: auth.email,
    role: auth.role,
    id: auth.id,
  };

  const accessToken = jsonwebtoken.sign(
    jwtPayload,
    config.jwt.accessSecret as Secret,
    {
      expiresIn: config.jwt.accessExpiration as any,
    }
  );

  const refreshToken = jsonwebtoken.sign(
    jwtPayload,
    config.jwt.refreshSecret as Secret,
    {
      expiresIn: config.jwt.refreshExpiration as any,
    }
  );

  // update fcmToken if any
  if (payload.fcmToken) {
    await prisma.auth.update({
      where: {
        email: payload.email,
      },
      data: {
        fcmToken: payload.fcmToken,
      },
    });
  }

  return {
    accessToken,
    refreshToken,
  };
};

const getAll = async (
  options: TPaginationOptions,
  query: Record<string, any>
) => {
  const andConditions: Prisma.AuthWhereInput[] = [];
  const requestedRoles = Array.isArray(query.role)
    ? query.role
    : typeof query.role === "string"
      ? query.role
          .split(",")
          .map((role: string) => role.trim())
          .filter(Boolean)
      : [];

  andConditions.push({
    OR: [
      {
        role: UserRole.WORKER,
      },
      {
        role: UserRole.EMPLOYER,
      },
    ],
    status: { in: [UserStatus.ACTIVE, UserStatus.BLOCKED] },
  });

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          email: { contains: query.searchTerm, mode: "insensitive" },
        },
        {
          profile: {
            OR: [{ name: { contains: query.searchTerm, mode: "insensitive" } }],
          },
        },
      ],
    });
  }

  if (requestedRoles.length > 0) {
    andConditions.push({
      role: {
        in: requestedRoles,
      },
    });
  }

  const whereConditions: Prisma.AuthWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const { page, take, skip, sortBy, orderBy } = calculatePagination(options);
  const auths = await prisma.auth.findMany({
    where: whereConditions,
    select: {
      id: true,
      email: true,
      role: true,
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
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: "desc" },
  });

  const total = await prisma.auth.count({
    where: whereConditions,
  });

  const meta = {
    page,
    limit: take,
    total,
  };
  return { meta, auths };
};

const getSingle = async (id: string) => {
  const auth = await prisma.auth.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      createdAt: true,
      profile: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  return auth;
};

const resetPassword = async (payload: TResetPasswordInput) => {
  const auth = await prisma.auth.findUniqueOrThrow({
    where: {
      email: payload.email,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      profile: {
        select: {
          name: true,
        },
      },
    },
  });

  const otp = await prisma.oTP.findFirstOrThrow({
    where: {
      authId: auth.id,
      isVerified: true,
      purpose: OTPPurpose.RESET_PASSWORD,
    },
  });

  if (!otp) throw new ApiError(401, "OTP is not verified!");
  if (!otp.resetTokenHash || !otp.resetTokenExpires)
    throw new ApiError(401, "Reset token is missing!");

  const hashedToken = crypto
    .createHash("sha256")
    .update(payload.resetToken)
    .digest("hex");

  if (otp.resetTokenHash !== hashedToken)
    throw new ApiError(401, "Invalid reset token!");

  if (otp.resetTokenExpires < new Date())
    throw new ApiError(401, "Reset token has expired!");

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await prisma.$transaction(async tn => {
    await tn.auth.update({
      where: {
        email: payload.email,
      },
      data: {
        password: hashedPassword,
      },
    });

    await tn.oTP.delete({
      where: {
        authId: auth.id,
      },
    });
  });

  // send email
  const subject = "Your Player Central Password Has Been Reset 🎉";
  const path = "./src/app/emailTemplates/passwordResetSuccess.html";
  const replacements = {
    name: auth.profile?.name || "there",
  };
  sendEmail(payload.email, subject, path, replacements);
};

const changePassword = async (
  payload: TChangePasswordInput,
  userId: string
) => {
  const auth = await prisma.auth.findUniqueOrThrow({
    where: {
      id: userId,
      status: UserStatus.ACTIVE,
    },
  });

  const hasMatched = await bcrypt.compare(payload.oldPassword, auth.password);
  if (!hasMatched) {
    throw new ApiError(400, "Old password is incorrect!");
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, 10);

  await prisma.auth.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });
};

const changeAccountStatus = async (userId: string, status: UserStatus) => {
  const auth = await prisma.auth.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });
  if (auth.role === UserRole.ADMIN)
    throw new ApiError(400, "Admin account cannot be changed!");

  await prisma.auth.update({
    where: {
      id: userId,
    },
    data: {
      status: status,
    },
  });

  const message =
    status === UserStatus.ACTIVE
      ? "Account activated successfully!"
      : status === UserStatus.BLOCKED
        ? "Account blocked successfully!"
        : status === UserStatus.DELETED
          ? "Account deleted successfully!"
          : "";
  return { message };
};

const refreshToken = async (token: string) => {
  if (!token) throw new ApiError(401, "Unauthorized!");
  const decodedUser = jwt.verify(token, config.jwt.refreshSecret as Secret);
  if (!decodedUser) throw new ApiError(401, "Unauthorized!");

  const user = await prisma.auth.findUniqueOrThrow({
    where: {
      id: (decodedUser as TAuthUser).id,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  const jwtPayload = {
    email: user.email,
    role: user.role,
    id: user.id,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt.accessSecret as Secret, {
    expiresIn: config.jwt.accessExpiration as any,
  });

  return { accessToken };
};

export const authServices = {
  signUp,
  login,
  getSingle,
  getAll,
  refreshToken,
  resetPassword,
  changePassword,
  changeAccountStatus,
};
