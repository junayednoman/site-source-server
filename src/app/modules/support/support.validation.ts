import { z } from "zod";

export const createSupportTicketZod = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  message: z.string().trim().min(1, "Message is required"),
});

export type TCreateSupportTicket = z.infer<typeof createSupportTicketZod>;
