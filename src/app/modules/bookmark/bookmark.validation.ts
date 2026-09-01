import { z } from "zod";

export const createJobBookmarkZod = z.object({
  jobId: z.string().min(1, "Job id is required"),
});

export const createWorkerBookmarkZod = z.object({
  workerAuthId: z.string().min(1, "Worker id is required"),
});

export type TCreateJobBookmark = z.infer<typeof createJobBookmarkZod>;
export type TCreateWorkerBookmark = z.infer<typeof createWorkerBookmarkZod>;
