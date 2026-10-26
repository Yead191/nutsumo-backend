import { z } from 'zod';

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
    profile: z.string().optional(),
  }),
});

const updateUserZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  location: z.string().optional(),
  image: z.string().optional(),
});

const updateProfileVisibilityZodSchema = z.object({
  body: z.object({
    isProfileVisible: z.boolean({
      required_error: 'isProfileVisible is required',
    }),
  }),
});

const deleteMultipleUsersSchema = z.object({
  body: z.object({
    ids: z
      .array(z.string({ required_error: 'User ID must be a string' }), {
        required_error: 'Array of user IDs is required',
      })
      .min(1, 'At least one user ID must be provided'),
  }),
});

const updateUserByAdminZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(['active', 'blocked', 'rejected', 'pending']).optional(),
    verified: z.boolean().optional(),
    company: z.string().optional(),
    interest: z.string().optional(),
    rejectionReason: z.string().optional(),
    phone: z.string().optional(),
  }),
});

const changeStatusZodSchema = z.object({
  body: z
    .object({
      status: z.enum(['active', 'blocked', 'rejected', 'pending']).optional(),
      rejectionReason: z.string().optional(),
    })
    .optional(),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  updateProfileVisibilityZodSchema,
  deleteMultipleUsersSchema,
  updateUserByAdminZodSchema,
  changeStatusZodSchema,
};
