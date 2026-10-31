import { z } from 'zod';
import {
  QUOTATION_STATUSES,
  QUOTATION_RATE_TYPES,
} from './quotation.constants';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const createQuotationValidationSchema = z.object({
  body: z.object({
    job: objectIdSchema,
    proposedAmount: z.coerce
      .number()
      .positive('Proposed amount must be greater than zero'),
    rateType: z.enum(
      Object.values(QUOTATION_RATE_TYPES) as [string, ...string[]],
      {
        required_error: 'Rate type is required (HOURLY, DAILY, or FIXED)',
      },
    ),
    message: z
      .string({
        required_error: 'Proposal message is required',
      })
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message cannot exceed 2000 characters'),
    estimatedDuration: z
      .string()
      .trim()
      .max(100, 'Estimated duration cannot exceed 100 characters')
      .optional(),
  }),
});

const updateQuotationValidationSchema = z.object({
  body: z
    .object({
      proposedAmount: z.coerce
        .number()
        .positive('Proposed amount must be greater than zero')
        .optional(),
      rateType: z
        .enum(Object.values(QUOTATION_RATE_TYPES) as [string, ...string[]])
        .optional(),
      message: z
        .string()
        .trim()
        .min(10, 'Message must be at least 10 characters')
        .max(2000, 'Message cannot exceed 2000 characters')
        .optional(),
      estimatedDuration: z
        .string()
        .trim()
        .max(100, 'Estimated duration cannot exceed 100 characters')
        .optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'At least one field is required to update quotation',
    }),
});

const rejectQuotationValidationSchema = z.object({
  body: z.object({
    rejectReason: z
      .string()
      .trim()
      .max(500, 'Reject reason cannot exceed 500 characters')
      .optional(),
  }),
});

const quotationIdValidationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const jobIdParamValidationSchema = z.object({
  params: z.object({
    jobId: objectIdSchema,
  }),
});

const getQuotationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    searchTerm: z.string().trim().optional(),
    status: z
      .enum(Object.values(QUOTATION_STATUSES) as [string, ...string[]])
      .optional(),
    rateType: z
      .enum(Object.values(QUOTATION_RATE_TYPES) as [string, ...string[]])
      .optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const QuotationValidations = {
  createQuotationValidationSchema,
  updateQuotationValidationSchema,
  rejectQuotationValidationSchema,
  quotationIdValidationSchema,
  jobIdParamValidationSchema,
  getQuotationsQuerySchema,
};
