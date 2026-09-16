import { z } from "zod";

export const createNotificationZod = z.object({
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().trim().min(1, "Message is required"),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type TCreateNotification = z.infer<typeof createNotificationZod>;

export const registerPushTokenZod = z.object({
  token: z.string().trim().min(1, "Push token is required"),
  provider: z.literal("expo").default("expo"),
  platform: z.enum(["ios", "android"]),
  installationId: z.string().trim().min(1, "Installation id is required"),
});

export type TRegisterPushToken = z.infer<typeof registerPushTokenZod>;
