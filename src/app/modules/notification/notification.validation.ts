import { z } from "zod";

export const createNotificationZod = z.object({
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().trim().min(1, "Message is required"),
});

export type TCreateNotification = z.infer<typeof createNotificationZod>;
