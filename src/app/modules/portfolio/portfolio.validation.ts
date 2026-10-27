import { z } from 'zod';

const createPortfolioZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    images: z
      .array(
        z.object({
          url: z.string({ required_error: 'Image URL is required' }),
          type: z.enum(['before', 'after', 'work']).default('work'),
        }),
      )
      .default([]),
    completedAt: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

const updatePortfolioZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    images: z
      .array(
        z.object({
          url: z.string(),
          type: z.enum(['before', 'after', 'work']),
        }),
      )
      .optional(),
    completedAt: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const PortfolioValidation = {
  createPortfolioZodSchema,
  updatePortfolioZodSchema,
};
