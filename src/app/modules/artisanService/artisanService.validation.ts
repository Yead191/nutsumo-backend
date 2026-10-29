import { z } from 'zod';

const createArtisanServiceZodSchema = z.object({
  body: z.object({
    service: z.string({ required_error: 'Service ID is required' }),
    rateAmount: z
      .number({ required_error: 'Rate amount is required' })
      .positive('Rate amount must be greater than 0'),
    rateType: z.enum(['HOURLY', 'DAILY'], {
      required_error: 'Rate type must be HOURLY or DAILY',
    }),
    description: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateArtisanServiceZodSchema = z.object({
  body: z.object({
    rateAmount: z.number().positive('Rate amount must be greater than 0').optional(),
    rateType: z.enum(['HOURLY', 'DAILY']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const ArtisanServiceValidation = {
  createArtisanServiceZodSchema,
  updateArtisanServiceZodSchema,
};
