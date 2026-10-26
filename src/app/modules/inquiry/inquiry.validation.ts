import { z } from 'zod';
import { InquiryStatus, ProjectBudget } from './inquiry.interface';

const createInquiryZod = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    email: z.string({ required_error: 'Email is required' }),
    phone: z.string().optional(),
    company: z.string().optional(),
    projectDescription: z.string({
      required_error: 'Project description is required',
    }),
    budget: z.nativeEnum(ProjectBudget, {
      required_error: 'Budget is required',
    }),
    note: z.string().optional(),
  }),
});

const updateInquiryZod = z.object({
  body: z.object({
    status: z.nativeEnum(InquiryStatus).optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    projectDescription: z.string().optional(),
    budget: z.nativeEnum(ProjectBudget).optional(),
    note: z.string().optional(),
  }),
});

export const InquiryValidations = { createInquiryZod, updateInquiryZod };
