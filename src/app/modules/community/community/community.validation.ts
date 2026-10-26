import { z } from 'zod';

const createCommunity = z.object({
  body: z.object({
    title: z.string().optional(),
    content: z
      .string({ required_error: 'Content is required' })
      .min(1, 'Content cannot be empty'),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    status: z.enum(['published', 'draft', 'archived']).optional(),
  }),
});

const updateCommunity = z.object({
  body: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    status: z.enum(['published', 'draft', 'archived']).optional(),
  }),
});

export const CommunityValidations = {
  createCommunity,
  updateCommunity,
};
