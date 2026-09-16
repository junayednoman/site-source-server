import {
  LoginProvider,
  OTPPurpose,
  Prisma,
  UserRole,
  UserStatus,
} from "@prisma/client";
import axios from "axios";
import crypto from "crypto";
import ApiError from "../../classes/ApiError.js";
import prisma from "../../utils/prisma.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";
import {
  TAppleLoginInput,
  TChangePasswordInput,
  TGoogleLoginInput,
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

type TSocialLoginPayload = (TGoogleLoginInput | TAppleLoginInput) & {
  email: string;
};

type TSocialTokenPayload = {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

type TJwksResponse = {
  keys: (crypto.webcrypto.JsonWebKey & { kid: string })[];
};

const getLoginProviderLabel = (provider: LoginProvider) =>
  provider.charAt(0) + provider.slice(1).toLowerCase();

const generateAuthTokens = (auth: {
  id: string;
  email: string;
  role: UserRole;
}) => {
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

  return { accessToken, refreshToken };
};

const checkLoginProvider = (
  loginProvider: LoginProvider,
  requestedProvider: LoginProvider
) => {
  if (loginProvider !== requestedProvider) {
    const providerName = getLoginProviderLabel(loginProvider);
    throw new ApiError(
      400,
      `This email is registered with ${providerName} login. Please use ${providerName} login.`
    );
  }
};

const getClientIds = (clientId?: string) =>
  clientId
    ?.split(",")
    .map(id => id.trim())
    .filter(Boolean) || [];

const verifySocialIdToken = async ({
  idToken,
  clientIds,
  issuer,
  jwksUrl,
  providerName,
}: {
  idToken: string;
  clientIds: string[];
  issuer: string | [string, ...string[]];
  jwksUrl: string;
  providerName: string;
}) => {
  if (clientIds.length === 0) {
    throw new ApiError(500, `${providerName} client id is not configured!`);
  }

  const decodedToken = jwt.decode(idToken, { complete: true });
  if (
    !decodedToken ||
    typeof decodedToken === "string" ||
    decodedToken.header.alg !== "RS256" ||
    !decodedToken.header.kid
  ) {
    throw new ApiError(401, `Invalid ${providerName} token!`);
  }

  const { data } = await axios.get<TJwksResponse>(jwksUrl);
  const jwk = data.keys.find(key => key.kid === decodedToken.header.kid);
  if (!jwk) throw new ApiError(401, `Invalid ${providerName} token!`);

  try {
    const publicKey = crypto
      .createPublicKey({
        key: jwk,
        format: "jwk",
      })
      .export({ format: "pem", type: "spki" });

    const verifiedPayload = jwt.verify(idToken, publicKey, {
      algorithms: ["RS256"],
      issuer,
      audience: clientIds as [string, ...string[]],
    }) as TSocialTokenPayload;

    if (!verifiedPayload.email) {
      throw new ApiError(401, `${providerName} token does not include email!`);
    }

    const emailVerified = verifiedPayload.email_verified;
    if (
      emailVerified !== undefined &&
      emailVerified !== true &&
      emailVerified !== "true"
    ) {
      throw new ApiError(401, `${providerName} email is not verified!`);
    }

    return verifiedPayload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, `Invalid ${providerName} token!`);
  }
};

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

  checkLoginProvider(auth.loginProvider, LoginProvider.EMAIL);

  if (auth.status === UserStatus.PENDING)
    throw new ApiError(400, "Please verify your account!");

  if (auth.status === UserStatus.BLOCKED)
    throw new ApiError(400, "Your account is blocked!");

  const hasMatched = await bcrypt.compare(payload.password, auth.password);
  if (!hasMatched) throw new ApiError(400, "Invalid email or password!");

  const { accessToken, refreshToken } = generateAuthTokens(auth);

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

const socialLogin = async (
  payload: TSocialLoginPayload,
  loginProvider: LoginProvider
) => {
  const existingAuth = await prisma.auth.findUnique({
    where: {
      email: payload.email,
    },
    include: {
      profile: true,
    },
  });

  if (existingAuth) {
    checkLoginProvider(existingAuth.loginProvider, loginProvider);

    if (existingAuth.status === UserStatus.PENDING)
      throw new ApiError(400, "Please verify your account!");

    if (existingAuth.status === UserStatus.BLOCKED)
      throw new ApiError(400, "Your account is blocked!");

    if (existingAuth.status === UserStatus.DELETED)
      throw new ApiError(400, "Your account is deleted!");

    await prisma.$transaction(async tn => {
      if (payload.fcmToken) {
        await tn.auth.update({
          where: {
            id: existingAuth.id,
          },
          data: {
            fcmToken: payload.fcmToken,
          },
        });
      }

      if (payload.name || payload.image) {
        await tn.profile.update({
          where: {
            authId: existingAuth.id,
          },
          data: {
            ...(payload.name ? { name: payload.name } : {}),
            ...(payload.image ? { image: payload.image } : {}),
          },
        });
      }
    });

    return generateAuthTokens(existingAuth);
  }

  const password = await bcrypt.hash(crypto.randomUUID(), 10);
  const fallbackName = payload.name || payload.email.split("@")[0] || "User";

  const auth = await prisma.$transaction(async tn => {
    const newAuth = await tn.auth.create({
      data: {
        email: payload.email,
        password,
        role: payload.role as UserRole,
        status: UserStatus.ACTIVE,
        loginProvider,
        ...(payload.fcmToken ? { fcmToken: payload.fcmToken } : {}),
      },
    });

    await tn.profile.create({
      data: {
        authId: newAuth.id,
        name: fallbackName,
        ...(payload.image ? { image: payload.image } : {}),
      },
    });

    if (payload.role === UserRole.WORKER) {
      await tn.workerProfile.create({
        data: {
          authId: newAuth.id,
          trades: [],
          certificates: [],
        },
      });
    }

    if (payload.role === UserRole.EMPLOYER) {
      await tn.employerProfile.create({
        data: {
          authId: newAuth.id,
        },
      });
    }

    return newAuth;
  });

  return generateAuthTokens(auth);
};

const googleLogin = async (payload: TGoogleLoginInput) => {
  const verifiedPayload = await verifySocialIdToken({
    idToken: payload.idToken,
    clientIds: getClientIds(config.socialAuth.googleClientId),
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    providerName: "Google",
  });

  return socialLogin(
    {
      ...payload,
      email: verifiedPayload.email as string,
      name: payload.name || verifiedPayload.name,
      image: payload.image || verifiedPayload.picture,
    },
    LoginProvider.GOOGLE
  );
};

const appleLogin = async (payload: TAppleLoginInput) => {
  const verifiedPayload = await verifySocialIdToken({
    idToken: payload.idToken,
    clientIds: getClientIds(config.socialAuth.appleClientId),
    issuer: "https://appleid.apple.com",
    jwksUrl: "https://appleid.apple.com/auth/keys",
    providerName: "Apple",
  });

  return socialLogin(
    {
      ...payload,
      email: verifiedPayload.email as string,
      name: payload.name || verifiedPayload.name,
      image: payload.image || verifiedPayload.picture,
    },
    LoginProvider.APPLE
  );
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
  googleLogin,
  appleLogin,
  getSingle,
  getAll,
  refreshToken,
  resetPassword,
  changePassword,
  changeAccountStatus,
};
