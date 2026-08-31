import { OTPPurpose, UserStatus } from "@prisma/client";
import generateOTP from "../../utils/generateOTP.js";
import prisma from "../../utils/prisma.js";
import { sendEmail } from "../../utils/sendEmail.js";
import ApiError from "../../classes/ApiError.js";
import bcrypt from "bcrypt";
import { TVerifyOtpInput } from "./otp.validation.js";
import crypto from "crypto";
import jsonwebtoken, { Secret } from "jsonwebtoken";
import config from "../../config/index.js";

const sendOtp = async (email: string, purposeInput?: string) => {
  const purpose =
    purposeInput &&
    Object.values(OTPPurpose).includes(purposeInput as OTPPurpose)
      ? (purposeInput as OTPPurpose)
      : OTPPurpose.VERIFY_ACCOUNT;
  const auth = await prisma.auth.findUniqueOrThrow({
    where: {
      email: email,
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

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  const otpData = {
    authId: auth.id,
    otp: hashedOtp,
    expires: otpExpires,
    attempts: 0,
    isVerified: false,
    purpose,
  };

  await prisma.oTP.upsert({
    where: {
      authId: auth.id,
    },
    update: otpData,
    create: otpData,
  });

  // send email
  const subject = "Your One-Time Password (OTP)";
  const path = "./src/app/emailTemplates/otp.html";
  sendEmail(email, subject, path, {
    otp,
    name: (auth?.profile?.name as string) || "there",
  });
};

const verifyOtp = async (payload: TVerifyOtpInput) => {
  console.log("payload", payload);
  const purpose = payload.purpose;

  const auth = await prisma.auth.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  const otp = await prisma.oTP.findFirstOrThrow({
    where: {
      authId: auth.id,
      isVerified: false,
      purpose,
    },
  });

  const hasOtpExpired = otp.expires < new Date();

  if (otp.attempts > 3)
    throw new ApiError(400, "Too many attempts! Please request a new one!");

  if (hasOtpExpired) {
    throw new ApiError(400, "OTP expired! Please request a new one!");
  }

  // Update the OTP attempts
  await prisma.oTP.update({
    where: {
      authId: auth.id,
    },
    data: {
      attempts: {
        increment: 1,
      },
    },
  });

  const hasMatched = await bcrypt.compare(payload.otp, otp.otp);
  if (!hasMatched) {
    throw new ApiError(400, "Invalid OTP! Please try again!");
  }

  const result = await prisma.$transaction(async tn => {
    if (purpose === OTPPurpose.VERIFY_ACCOUNT) {
      const updatedAuth = await tn.auth.update({
        where: {
          email: payload.email,
        },
        data: {
          status: UserStatus.ACTIVE,
        },
        include: {
          profile: true,
        },
      });

      await prisma.oTP.delete({
        where: {
          authId: auth.id,
        },
      });

      // send verification success email
      if (updatedAuth) {
        const subject = "Welcome to Player Central! Your Email is Verified";
        const name = updatedAuth.profile?.name || "there";
        const path = "./src/app/emailTemplates/verificationSuccess.html";
        sendEmail(updatedAuth.email, subject, path, { name });
      }

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

      return { accessToken };
    } else {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const tokenExpires = new Date(Date.now() + 10 * 60 * 1000);

      await tn.oTP.update({
        where: {
          authId: auth.id,
        },
        data: {
          isVerified: true,
          resetTokenHash: tokenHash,
          resetTokenExpires: tokenExpires,
        },
      });

      return { resetToken: token };
    }
  });

  return result;
};

export const otpServices = {
  verifyOtp,
  sendOtp,
};
