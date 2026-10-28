import { z } from 'zod';

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Category name is required' }).min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.string().transform(v => v === 'true')])
      .optional(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.string().transform(v => v === 'true')])
      .optional(),
  }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
