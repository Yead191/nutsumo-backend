import { Schema, model } from 'mongoose';
import { IQuotation, QuotationModel } from './quotation.interface';
import {
  QUOTATION_STATUSES,
  QUOTATION_RATE_TYPES,
} from './quotation.constants';

const quotationSchema = new Schema<IQuotation, QuotationModel>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    proposedAmount: {
      type: Number,
      required: true,
      min: [1, 'Proposed amount must be greater than zero'],
    },
    rateType: {
      type: String,
      enum: Object.values(QUOTATION_RATE_TYPES),
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    estimatedDuration: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: Object.values(QUOTATION_STATUSES),
      default: QUOTATION_STATUSES.PENDING,
      index: true,
    },
    rejectReason: {
      type: String,
      default: '',
      trim: true,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound index: prevents duplicate quotations for the same job by the same artisan
quotationSchema.index({ job: 1, artisan: 1 }, { unique: true });

quotationSchema.index({ customer: 1, status: 1, createdAt: -1 });
quotationSchema.index({ artisan: 1, status: 1, createdAt: -1 });
quotationSchema.index({ job: 1, status: 1 });

export const Quotation = model<IQuotation, QuotationModel>(
  'Quotation',
  quotationSchema,
);
