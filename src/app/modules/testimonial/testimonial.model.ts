import { Schema, model } from 'mongoose';
import { ITestimonial, TestimonialModel } from './testimonial.interface';

const testimonialSchema = new Schema<ITestimonial, TestimonialModel>(
  {
    name: {
      type: String,
      required: true,
    },
    quote: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const Testimonial = model<ITestimonial, TestimonialModel>(
  'Testimonial',
  testimonialSchema,
);
