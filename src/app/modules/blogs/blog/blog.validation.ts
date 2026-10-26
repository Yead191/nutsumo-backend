import { z } from 'zod';
import { BLOG_STATUS } from './blog.constants';

const createBlogZod = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty'),
    content: z
      .string({ required_error: 'Content is required' })
      .min(1, 'Content cannot be empty'),
    category: z
      .string({ required_error: 'Category ID is required' })
      .trim()
      .min(1, 'Category ID is required'),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    status: z
      .enum([
        BLOG_STATUS.DRAFT,
        BLOG_STATUS.PUBLISHED,
        BLOG_STATUS.ARCHIVED,
      ])
      .optional(),
    isFeatured: z.union([z.boolean(), z.string()]).optional(),
    publishedAt: z.string().optional(),
    image: z.string().optional(),
  }),
});

const updateBlogZod = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').optional(),
    content: z.string().min(1, 'Content cannot be empty').optional(),
    category: z.string().trim().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    status: z
      .enum([
        BLOG_STATUS.DRAFT,
        BLOG_STATUS.PUBLISHED,
        BLOG_STATUS.ARCHIVED,
      ])
      .optional(),
    isFeatured: z.union([z.boolean(), z.string()]).optional(),
    publishedAt: z.string().optional(),
    image: z.string().optional(),
  }),
});

const updateBlogStatusZod = z.object({
  body: z.object({
    status: z.enum(
      [BLOG_STATUS.DRAFT, BLOG_STATUS.PUBLISHED, BLOG_STATUS.ARCHIVED],
      {
        required_error: 'Status is required',
      },
    ),
  }),
});

export const BlogValidations = {
  createBlogZod,
  updateBlogZod,
  updateBlogStatusZod,
};
