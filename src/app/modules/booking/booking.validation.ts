import { z } from 'zod';

const deliverBookingValidationSchema = z.object({
  body: z.object({
    deliveryNotes: z
      .string({
        required_error: 'Delivery notes are required',
      })
      .min(5, 'Delivery notes must be at least 5 characters'),
    deliveryProof: z
      .union([z.array(z.string()), z.string()])
      .optional(),
    workImages: z
      .union([z.array(z.string()), z.string()])
      .optional(),
  }),
});

const requestRevisionValidationSchema = z.object({
  body: z.object({
    revisionNotes: z
      .string({
        required_error: 'Revision notes are required',
      })
      .min(5, 'Revision notes must be at least 5 characters'),
  }),
});

const disputeBookingValidationSchema = z.object({
  body: z.object({
    reason: z
      .string({
        required_error: 'Dispute reason is required',
      })
      .min(10, 'Dispute reason must be at least 10 characters'),
  }),
});

const confirmCompletionValidationSchema = z.object({
  body: z.object({
    rating: z
      .number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5')
      .optional(),
    feedback: z.string().optional(),
  }),
});

const approvePayoutValidationSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});

const releasePayoutValidationSchema = z.object({
  body: z.object({
    payoutMethod: z
      .enum(['STRIPE_TRANSFER', 'MANUAL_BANK', 'WALLET'])
      .optional(),
    notes: z.string().optional(),
  }),
});

export const BookingValidation = {
  deliverBookingValidationSchema,
  requestRevisionValidationSchema,
  disputeBookingValidationSchema,
  confirmCompletionValidationSchema,
  approvePayoutValidationSchema,
  releasePayoutValidationSchema,
};
