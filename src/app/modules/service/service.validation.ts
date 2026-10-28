import { z } from 'zod';

const createServiceZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Service name is required' }).min(2, 'Name must be at least 2 characters'),
    category: z.string({ required_error: 'Category ID is required' }),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.string().transform(v => v === 'true')])
      .optional(),
  }),
});

const updateServiceZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.string().transform(v => v === 'true')])
      .optional(),
  }),
});

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
