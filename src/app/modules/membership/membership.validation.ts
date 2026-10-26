import { z } from 'zod';

const createMembershipZodSchema = z.object({
    body: z.object({
        name: z
            .string({
                required_error: 'Membership name is required',
            })
            .trim()
            .min(2, 'Membership name must be at least 2 characters'),

        tagline: z.string({
            required_error: 'Tagline is required',
        }).trim(),

        price: z.number({
            required_error: 'Price is required',
            invalid_type_error: 'Price must be a number'
        }).min(0, 'Price cannot be negative'),

        recurring: z.enum(['week', 'month', 'year']),
        interval_count: z.number({
            invalid_type_error: 'Interval count must be a number',
        }).min(1, 'Interval count cannot be negative').optional(),

        featured: z.boolean(),

        highlight: z.string().trim().optional(),

        features: z.array(z.string()).nonempty({
            message: 'At least one feature is required.',
        }),
        has_trial: z.boolean().optional(),
        trial_period_days: z.number().min(0).optional(),
    }),
});

const updateMembershipZodSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2, 'Membership name must be at least 2 characters').optional(),
        tagline: z.string().trim().optional(),
        price: z.number({
            invalid_type_error: 'Price must be a number'
        }).min(0, 'Price cannot be negative').optional(),
        interval: z.enum(['week', 'month', 'year']).optional(),
        interval_count: z.number({
            invalid_type_error: 'Interval count must be a number',
        }).min(1, 'Interval count cannot be negative').optional(),
        featured: z.coerce.boolean().optional(),
        highlight: z.string().trim().optional(),
        features: z.array(z.string()).min(1, 'At least one feature is required').optional(),
        has_trial: z.boolean().optional(),
        trial_period_days: z.number().min(0).optional(),
    }),
});

export const MembershipValidations = { createMembershipZodSchema, updateMembershipZodSchema };
