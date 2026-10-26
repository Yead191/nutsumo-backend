import { Model } from 'mongoose';

export type ITestimonial = {
  name: string;
  quote: string;
  role: string;
  company: string;
  image: string;
};

export type TestimonialModel = Model<ITestimonial>;
