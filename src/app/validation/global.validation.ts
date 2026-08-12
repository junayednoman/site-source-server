import z from "zod";

export const passwordZod = z
  .string({ message: "Password is required" })
  .min(7, "Password must be at least 7 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const emailZod = z
  .string({ message: "Email is required" })
  .email("Invalid email address")
  .trim()
  .toLowerCase()
  .nonempty("Email is required");

export const phoneZod = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .nullish()
  .transform(val => val ?? null);
