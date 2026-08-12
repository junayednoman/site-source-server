import z from "zod";
import { emailZod } from "../../validation/global.validation.js";
import { OTPPurpose } from "@prisma/client";

export const verifyOtpZod = z.object({
  email: emailZod,
  otp: z
    .string({ message: "OTP is required" })
    .min(6, "OTP must be at least 6 characters long")
    .max(6, "OTP must be at most 6 characters long"),
  purpose: z.nativeEnum(OTPPurpose),
});

export type TVerifyOtpInput = z.infer<typeof verifyOtpZod>;
