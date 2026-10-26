import { z } from 'zod';

const createCommentZodSchema = z.object({
  body: z
    .object({
      text: z.string().trim().max(2000, 'Comment is too long').optional(),
      comment: z.string().trim().max(2000, 'Comment is too long').optional(),
    })
    .refine(data => Boolean((data.text && data.text.length > 0) || (data.comment && data.comment.length > 0)), {
      message: 'Comment text is required',
    }),
});

const replyCommentZodSchema = z.object({
  body: z
    .object({
      text: z.string().trim().max(2000, 'Reply is too long').optional(),
      comment: z.string().trim().max(2000, 'Reply is too long').optional(),
    })
    .refine(data => Boolean((data.text && data.text.length > 0) || (data.comment && data.comment.length > 0)), {
      message: 'Reply text is required',
    }),
});

const updateCommentZodSchema = z.object({
  body: z.object({
    text: z.string().trim().max(2000, 'Comment is too long').optional(),
    comment: z.string().trim().max(2000, 'Comment is too long').optional(),
  }),
});

export const CommunityCommentValidations = {
  createCommentZodSchema,
  replyCommentZodSchema,
  updateCommentZodSchema,
};
