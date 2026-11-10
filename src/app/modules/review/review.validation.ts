import { z } from 'zod';

const createReviewValidationSchema = z.object({
  body: z.object({
    booking: z.string({
      required_error: 'Booking ID is required',
    }),
    rating: z
      .number({
        required_error: 'Rating is required',
      })
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string({
        required_error: 'Review comment is required',
      })
      .min(3, 'Comment must be at least 3 characters')
      .max(2000, 'Comment cannot exceed 2000 characters'),
    qualityRating: z.number().min(1).max(5).optional(),
    communicationRating: z.number().min(1).max(5).optional(),
    timelinessRating: z.number().min(1).max(5).optional(),
  }),
});

const replyReviewValidationSchema = z.object({
  body: z.object({
    comment: z
      .string({
        required_error: 'Reply comment is required',
      })
      .min(2, 'Reply must be at least 2 characters')
      .max(1000, 'Reply cannot exceed 1000 characters'),
  }),
});

const updateReviewValidationSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(3).max(2000).optional(),
    qualityRating: z.number().min(1).max(5).optional(),
    communicationRating: z.number().min(1).max(5).optional(),
    timelinessRating: z.number().min(1).max(5).optional(),
  }),
});

export const ReviewValidation = {
  createReviewValidationSchema,
  replyReviewValidationSchema,
  updateReviewValidationSchema,
};
