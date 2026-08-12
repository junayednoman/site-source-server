import z from "zod";
import { emailZod, passwordZod } from "../../validation/global.validation.js";
import { UserStatus } from "@prisma/client";

const commonSignupFields = {
  email: emailZod,
  password: passwordZod,
  name: z.string().min(1, "Name is required").trim(),
};

const workerSignupZod = z.object({
  ...commonSignupFields,
  role: z.literal("WORKER"),
  skills: z.array(z.string().min(1)).nonempty("Skills are required"),
  certificates: z
    .array(z.string().min(1))
    .nonempty("Certificates are required"),
});

const employerSignupZod = z.object({
  ...commonSignupFields,
  role: z.literal("EMPLOYER"),
});

export const signupZod = z.discriminatedUnion("role", [
  workerSignupZod,
  employerSignupZod,
]);

export type TSignup = z.infer<typeof signupZod>;

export const loginZodSchema = z.object({
  email: emailZod,
  password: passwordZod,
  fcmToken: z.string().optional(),
  isMobileApp: z.boolean().default(false),
});

export type TLoginInput = z.infer<typeof loginZodSchema>;

export const googleLoginSchema = z.object({
  email: emailZod,
  name: z.string(),
  image: z.string(),
  fcmToken: z.string(),
  role: z.enum(["WORKER", " EMPLOYER"]),
});

export type TGoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const resetPasswordZod = z.object({
  email: emailZod,
  password: passwordZod,
  resetToken: z.string().min(1, "Reset token is required"),
});

export type TResetPasswordInput = z.infer<typeof resetPasswordZod>;

export const changePasswordZod = z.object({
  oldPassword: passwordZod,
  newPassword: passwordZod,
});

export type TChangePasswordInput = z.infer<typeof changePasswordZod>;

export const changeAccountStatusZod = z.object({
  status: z
    .enum([UserStatus.ACTIVE, UserStatus.DELETED, UserStatus.BLOCKED])
    .default("ACTIVE")
    .transform(val => val.toUpperCase()),
});
