import { z } from 'zod';

const saveJobAlertZodSchema = z.object({
  body: z.object({
    keywords: z.string().trim().min(2).max(80),
    category: z.string().optional(),
    service: z.string().optional(),
  }),
});

export const JobAlertValidation = {
  saveJobAlertZodSchema,
};
