import z from "zod";
import { UserStatus } from "@prisma/client";

export const profileUpdateZod = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
});

export const updateUserStatusZod = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]),
});
