import z from "zod";
import { JobTrade } from "@prisma/client";

const locationZod = z.object({
  type: z.string().optional(),
  coordinates: z
    .array(z.number())
    .length(2, "Coordinates must contain longitude and latitude")
    .optional(),
});

export const updateWorkerProfileZod = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
  trades: z.array(z.nativeEnum(JobTrade)).optional(),
  experience: z.coerce
    .number()
    .int()
    .min(0, "Experience cannot be negative")
    .optional(),
  address: locationZod.optional(),
  certificates: z.array(z.string().min(1)).optional(),
});

export type TUpdateWorkerProfile = z.infer<typeof updateWorkerProfileZod>;
