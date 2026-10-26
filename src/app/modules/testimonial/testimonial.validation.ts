import { z } from 'zod';

const createTestimonialZod = z.object({
  body: z.object({
    name: z.string({ required_error: 'Testimonial name is required' }),
    quote: z.string({ required_error: 'Testimonial quote is required' }),
    role: z.string({ required_error: 'Testimonial role is required' }),
    company: z.string({ required_error: 'Testimonial company is required' }),
    image: z.string().optional(),
  }),
});

const updateTestimonialZod = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Testimonial name is required' })
      .optional(),
    quote: z
      .string({ required_error: 'Testimonial quote is required' })
      .optional(),
    role: z
      .string({ required_error: 'Testimonial role is required' })
      .optional(),
    company: z
      .string({ required_error: 'Testimonial company is required' })
      .optional(),
    image: z.string().optional(),
  }),
  params: z.object({
    id: z.string({ required_error: 'Testimonial ID is required' }),
  }),
});

export const TestimonialValidations = {
  createTestimonialZod,
  updateTestimonialZod,
};
