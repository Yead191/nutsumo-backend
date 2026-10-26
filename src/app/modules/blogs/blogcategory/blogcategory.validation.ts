import { z } from 'zod';

const createBlogCategoryZod = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(1, 'Category name cannot be empty'),
  }),
});

const updateBlogCategoryZod = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(1, 'Category name cannot be empty'),
  }),
});

export const BlogCategoryValidations = {
  createBlogCategoryZod,
  updateBlogCategoryZod,
};

// Also export alias BlogcategoryValidations
export const BlogcategoryValidations = BlogCategoryValidations;
