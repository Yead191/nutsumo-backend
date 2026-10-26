import { Schema, model } from 'mongoose';
import {
  IInquiry,
  InquiryModel,
  InquiryStatus,
  ProjectBudget,
} from './inquiry.interface';

const inquirySchema = new Schema<IInquiry, InquiryModel>(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowerCase: true,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    company: {
      type: String,
      required: false,
    },
    projectDescription: {
      type: String,
      trim: true,
      required: true,
    },
    budget: {
      type: String,
      enum: Object.values(ProjectBudget),
      default: ProjectBudget.UNDER_100,
    },
    status: {
      type: String,
      enum: Object.values(InquiryStatus),
      default: InquiryStatus.NEW,
    },
    note: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

export const Inquiry = model<IInquiry, InquiryModel>('Inquiry', inquirySchema);
