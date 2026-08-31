import z from "zod";

const locationZod = z.object({
  type: z.string().optional(),
  coordinates: z
    .array(z.number())
    .length(2, "Coordinates must contain longitude and latitude")
    .optional(),
});

export const updateEmployerProfileZod = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
  address: locationZod.optional(),
});

export type TUpdateEmployerProfile = z.infer<typeof updateEmployerProfileZod>;
