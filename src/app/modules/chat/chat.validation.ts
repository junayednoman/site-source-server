import { z } from "zod";

const messageContentBaseZod = z.object({
  content: z.string().trim().optional(),
  image: z.string().trim().optional(),
});

export const sendMessageBodyZod = messageContentBaseZod.refine(
  data => data.content || data.image,
  {
    message: "Message content or image is required",
    path: ["content"],
  }
);

export const sendMessageZod = messageContentBaseZod
  .extend({
    conversationId: z.string().min(1, "Conversation id is required"),
  })
  .refine(data => data.content || data.image, {
    message: "Message content or image is required",
    path: ["content"],
  });

export const readMessageZod = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
});

export type TSendMessage = z.infer<typeof sendMessageZod>;
