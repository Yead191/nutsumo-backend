import { z } from 'zod';

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Category name is required' }),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export const ServiceCategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
