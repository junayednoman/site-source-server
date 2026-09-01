import z from "zod";
import {
  ApplicationStatus,
  JobMustHave,
  JobOfferStatus,
  JobTrade,
} from "@prisma/client";

const locationZod = z.object({
  type: z.string().default("Point"),
  coordinates: z
    .array(z.number())
    .length(2, "Coordinates must contain longitude and latitude"),
});

const workingHourZod = z.object({
  day: z.string().min(1, "Day is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isPayOnePointFiveX: z.boolean().optional(),
  isPayTwoX: z.boolean().optional(),
});

export const createJobZod = z.object({
  title: z.string().min(1, "Title is required").trim(),
  trades: z.nativeEnum(JobTrade).array().nonempty("Trades are required"),
  hourlyRate: z.coerce.number().int().min(0, "Hourly rate cannot be negative"),
  workersNeeded: z.coerce
    .number()
    .int()
    .min(1, "At least one worker is required"),
  location: locationZod,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  workingHours: z.array(workingHourZod).nonempty("Working hours are required"),
  mustHave: z.array(z.nativeEnum(JobMustHave)),
  note: z.string().min(1, "Note is required").trim(),
});

export type TCreateJob = z.infer<typeof createJobZod>;

export const updateApplicationStatusZod = z.object({
  status: z.enum([ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED]),
});

export const sendJobOfferZod = z.object({
  jobId: z.string().min(1, "Job id is required"),
  workerAuthId: z.string().min(1, "Worker id is required"),
});

export type TSendJobOffer = z.infer<typeof sendJobOfferZod>;

export const updateJobOfferStatusZod = z.object({
  status: z.enum([JobOfferStatus.ACCEPTED, JobOfferStatus.REJECTED]),
});
