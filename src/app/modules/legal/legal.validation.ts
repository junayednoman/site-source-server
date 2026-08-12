import { z } from "zod";

export const updateLegalSchema = z.object({
  privacyPolicy: z.string().trim().min(1),
  termsCondition: z.string().trim().min(1),
  aboutUs: z.string().trim().min(1),
});

export type TUpdateLegal = z.infer<typeof updateLegalSchema>;
