import { z } from 'zod';
import { USER_ROLES } from '../../../enums/user';

const createVerifyEmailZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    oneTimeCode: z.number({ required_error: 'One time code is required' }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z.string({ required_error: 'Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: 'Current Password is required',
    }),
    newPassword: z.string({ required_error: 'New Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

// const createRegisterZodSchema = z.object({
//   body: z.object({
//     name: z.string({ required_error: 'Name is required' }),
//     email: z.string({ required_error: 'Email is required' }),
//     password: z.string({ required_error: 'Password is required' }),
//     role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN])
//   })
// })
const createRegisterUserZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters'),

    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Please provide a valid email'),

    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters'),

    phone: z.string().optional(),
  }),
});

const createRegisterVendorZodSchema = z.object({
  body: z.object({
    // Basic Information
    name: z
      .string({
        required_error: 'Full name is required',
      })
      .min(2, 'Please enter your full name'),

    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Please provide a valid email'),

    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters'),

    company: z
      .string({
        required_error: 'Company name is required',
      })
      .min(2, 'Please enter your company'),

    vendorProfile: z.string().refine(value => {
      const parseData = JSON.parse(value);
      const validData = developerProfileSchema.parse(parseData);
      return !!validData;
    }),
  }),
});

export const developerProfileSchema = z.object({
  jobTitle: z
    .string()
    .min(2, 'Job title is required')
    .max(100, 'Job title is too long'),

  contactNo: z
    .string()
    .min(10, 'Invalid contact number')
    .max(20, 'Invalid contact number')
    .regex(/^\+?[0-9]+$/, 'Invalid phone number'),

  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio cannot exceed 500 characters'),

  expertise: z
    .array(z.string().min(1))
    .min(1, 'Select at least one expertise')
    .refine(
      items => new Set(items).size === items.length,
      'Expertise must not contain duplicates',
    ),

  // yearsExperience: z
  //   .string()
  //   .refine(
  //     val => !isNaN(Number(val)) && Number(val) >= 0,
  //     'Years of experience must be a valid number',
  //   ),
  yearsExperience: z.string().min(1, 'Select your years of experience'),

  degree: z.string().min(2, 'Degree is required').max(100),

  linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),

  hourlyRate: z
    .number()
    .refine(
      val => !isNaN(Number(val)) && Number(val) > 0,
      'Hourly rate must be greater than 0',
    ),

  availability: z.enum([
    'Full Time',
    'Part Time',
    'Project Based',
    'Weekends Only',
    'Limited',
  ]),

  consultationTypes: z
    .array(z.string())
    .min(1, 'Select at least one consultation type'),

  applicationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const googleLoginZodSchema = z.object({
  body: z.object({
    idToken: z.string({
      required_error: 'Google ID token is required',
    }),
  }),
});

export const AuthValidation = {
  createVerifyEmailZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  createRegisterVendorZodSchema,
  createRegisterUserZodSchema,
  googleLoginZodSchema,
};
