import { z } from "zod";

export const createReviewZod = z.object({
  jobId: z.string().min(1, "Job id is required"),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  feedback: z.string().trim().optional(),
});

export type TCreateReview = z.infer<typeof createReviewZod>;
