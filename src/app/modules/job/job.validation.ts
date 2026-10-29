import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const jobPayloadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),

  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),

  category: objectIdSchema.nullable().optional(),

  service: objectIdSchema.nullable().optional(),

  customServiceName: z
    .string()
    .trim()
    .max(150, 'Custom service name cannot exceed 150 characters')
    .optional(),

  location: z
    .string()
    .trim()
    .min(2, 'Location must be at least 2 characters')
    .max(500, 'Location cannot exceed 500 characters'),

  budget: z.coerce
    .number()
    .finite('Budget must be a valid number')
    .min(0, 'Budget cannot be negative')
    .nullable()
    .optional(),

  preferredDate: z.coerce
    .string()
    .datetime({ offset: true })
    .transform(value => new Date(value))
    .nullable()
    .optional(),

  postCode: z
    .string()
    .trim()
    .max(10, 'Post code cannot exceed 10 characters')
    .optional(),

  images: z.array(z.string()).optional(),
});

// Create job
const createJobValidationSchema = z.object({
  body: jobPayloadSchema,
});

// Update job: allow partial updates
const updateJobValidationSchema = z.object({
  body: jobPayloadSchema.partial(),
});

// Validate job ID from route params (supports both :id and :jobId)
const jobIdValidationSchema = z.object({
  params: z
    .object({
      id: objectIdSchema.optional(),
      jobId: objectIdSchema.optional(),
    })
    .refine(data => Boolean(data.id || data.jobId), {
      message: 'Valid job ID is required in route params',
    }),
});

// Validate query parameters
const getJobsValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),

    searchTerm: z.string().trim().optional(),

    category: objectIdSchema.optional(),
    service: objectIdSchema.optional(),

    status: z
      .enum(['OPEN', 'BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .optional(),

    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const JobValidations = {
  createJobValidationSchema,
  updateJobValidationSchema,
  jobIdValidationSchema,
  getJobsValidationSchema,
};
