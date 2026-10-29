import { z } from 'zod';

const portfolioImageItemSchema = z.object({
  url: z.string().optional(),
  type: z.enum(['before', 'after', 'work']).default('work'),
});

const createPortfolioZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    images: z
      .union([
        z.array(portfolioImageItemSchema),
        z.array(z.string()),
        z.string(),
      ])
      .optional(),
    completedAt: z.string().optional(),
    isPublished: z.union([z.boolean(), z.string()]).optional(),
  }),
});

const updatePortfolioZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    images: z
      .union([
        z.array(portfolioImageItemSchema),
        z.array(z.string()),
        z.string(),
      ])
      .optional(),
    completedAt: z.string().optional(),
    isPublished: z.union([z.boolean(), z.string()]).optional(),
  }),
});

export const PortfolioValidation = {
  createPortfolioZodSchema,
  updatePortfolioZodSchema,
};
