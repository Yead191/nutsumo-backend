import { z } from 'zod';

const faqItemValidation = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(1, 'Question cannot be empty'),
  answer: z
    .string({ required_error: 'Answer is required' })
    .trim()
    .min(1, 'Answer cannot be empty'),
});

export const FaqValidations = {
  createFaq: z.object({
    body: z.object({
      title: z
        .string({ required_error: 'Title is required' })
        .trim()
        .min(1, 'Title cannot be empty'),
      items: z.array(faqItemValidation).default([]),
      isActive: z.boolean().optional(),
      order: z.number().optional(),
    }),
  }),

  updateFaq: z.object({
    body: z.object({
      title: z.string().trim().min(1, 'Title cannot be empty').optional(),
      items: z.array(faqItemValidation).optional(),
      isActive: z.boolean().optional(),
      order: z.number().optional(),
    }),
  }),
};
