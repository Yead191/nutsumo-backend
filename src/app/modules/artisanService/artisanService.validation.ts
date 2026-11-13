import { z } from 'zod';

const createArtisanServiceZodSchema = z.object({
  body: z
    .object({
      service: z.string().optional(),
      category: z.string().optional(),
      customName: z.string().trim().min(3).max(80).optional(),
      proposedCategory: z.string().trim().max(80).optional(),
      rateAmount: z
        .number({ required_error: 'Rate amount is required' })
        .positive('Rate amount must be greater than 0'),
      rateType: z.enum(['HOURLY', 'DAILY'], {
        required_error: 'Rate type must be HOURLY or DAILY',
      }),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(data => Boolean(data.service) || Boolean(data.customName), {
      message: 'Select a catalog service, or enter a custom service name',
    }),
});

const updateArtisanServiceZodSchema = z.object({
  body: z.object({
    customName: z.string().trim().min(3).max(80).optional(),
    rateAmount: z.number().positive('Rate amount must be greater than 0').optional(),
    rateType: z.enum(['HOURLY', 'DAILY']).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const reviewArtisanServiceZodSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().max(300).optional(),
  }),
});

export const ArtisanServiceValidation = {
  createArtisanServiceZodSchema,
  updateArtisanServiceZodSchema,
  reviewArtisanServiceZodSchema,
};
