import z from "zod";

export const profileUpdateZod = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
});
