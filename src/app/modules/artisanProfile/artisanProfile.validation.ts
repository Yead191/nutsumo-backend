import { z } from 'zod';

const createArtisanProfileZodSchema = z.object({
  body: z.object({
    businessName: z.string().optional(),
    trade: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    experienceYears: z.number().min(0).optional(),
    availabilityStatus: z
      .enum(['Available', 'Booked', 'Unavailable'])
      .optional(),
    hourlyRate: z.number().min(0).optional(),
    startingRate: z.number().min(0).optional(),
    isProfilePublic: z.boolean().optional(),
  }),
});

const updateArtisanProfileZodSchema = z.object({
  body: z.object({
    businessName: z.string().optional(),
    trade: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    experienceYears: z.number().min(0).optional(),
    availabilityStatus: z
      .enum(['Available', 'Booked', 'Unavailable'])
      .optional(),
    hourlyRate: z.number().min(0).optional(),
    startingRate: z.number().min(0).optional(),
    completedJobs: z.number().min(0).optional(),
    isProfilePublic: z.boolean().optional(),
  }),
});

export const ArtisanProfileValidation = {
  createArtisanProfileZodSchema,
  updateArtisanProfileZodSchema,
};
